import { DefaultExecutor } from "./default.ts";
import type { ExecuteInput, ExecutorExecuteResult, ProviderCredentials } from "./base.ts";

const SENSITIVE_CONTENT_REJECTION =
  "抱歉，系统检测到您当前输入的信息存在敏感内容，我无法响应您的请求，请检查后重新输入";
const LARGE_TOOL_METADATA_BYTES = 64 * 1024;

/**
 * CodeBuddy CN 网关返回非标准 SSE 流, 会破坏 VS Code Copilot 的 tool-calling 循环.
 * 参考项目 proxy.js (convertDelta/convertChoice) 揭示的三个非标准行为:
 *
 * 1. 每个 delta chunk 都带 `"tool_calls": []` 空数组 (即使不调工具) — 必须删除该字段.
 * 2. 带 tools 的请求里, 某些 chunk 夹带退化 tool_call (只有 index, name/arguments 为空).
 *    这种对象若透传给 VS Code, 会产生 name 为空的 tool_calls → VS Code 无法解析 →
 *    报 `unknown` 并无限重试. 必须过滤掉 name 为空的退化 tool_call.
 * 3. finish_reason 返回 `""` 空字符串 (非标准). OpenAI 规范中, 进行中的 chunk
 *    用 `null`, 最后一条用 `"stop"`. 空串在 passthrough 里会被当作"未结束",
 *    最终由 #7800 合成逻辑补发假的 stop, 行为不稳定. 统一转 `null`.
 *
 * 此转换器在 chunk 进入 OmniRoute passthrough 聚合 (stream.ts) 之前清洗原始帧,
 * 是最早、最干净的拦截点. 借鉴 glm.ts / zed-hosted.ts 的 TransformStream 模式.
 */
function createCodeBuddyCnStreamTransform(): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const emit = (controller: TransformStreamDefaultController<Uint8Array>, data: string): void => {
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  };

  const processLine = (
    line: string,
    controller: TransformStreamDefaultController<Uint8Array>
  ): void => {
    const trimmed = line.trim();
    if (trimmed === "") return;
    if (trimmed === "data: [DONE]") {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      return;
    }
    if (!trimmed.startsWith("data: ")) {
      // 透传非 data 行 (如注释行、心跳)
      controller.enqueue(encoder.encode(`${trimmed}\n`));
      return;
    }

    const jsonStr = trimmed.slice(6);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      // JSON 解析失败, 原样透传
      controller.enqueue(encoder.encode(`${trimmed}\n\n`));
      return;
    }

    const choices = parsed.choices;
    if (Array.isArray(choices)) {
      for (const choice of choices) {
        if (!choice || typeof choice !== "object" || Array.isArray(choice)) continue;
        const c = choice as Record<string, unknown>;
        const delta = c.delta as Record<string, unknown> | undefined;
        if (delta && typeof delta === "object" && !Array.isArray(delta)) {
          // 1. 过滤空 tool_calls: [] 数组
          if (Array.isArray(delta.tool_calls) && delta.tool_calls.length === 0) {
            delete delta.tool_calls;
          }
          // 2. 过滤退化 tool_call (name 为空且无累积参数) — 保留有真实 name 的调用
          if (Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0) {
            const kept = (delta.tool_calls as Array<Record<string, unknown>>).filter((tc) => {
              if (!tc || typeof tc !== "object" || Array.isArray(tc)) return false;
              const fn = tc.function as Record<string, unknown> | undefined;
              const name = typeof fn?.name === "string" ? fn.name : "";
              // 保留: 有非空 name, 或仍在累积参数 (arguments 非空说明是真实调用的后续分片)
              const args = typeof fn?.arguments === "string" ? fn.arguments : "";
              return name.trim().length > 0 || args.trim().length > 0;
            });
            if (kept.length === 0) {
              delete delta.tool_calls;
            } else {
              delta.tool_calls = kept;
            }
          }
        }
        // 3. 归一 finish_reason: "" → null
        if (c.finish_reason === "") {
          c.finish_reason = null;
        }
      }
    }

    emit(controller, JSON.stringify(parsed));
  };

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        processLine(line, controller);
      }
    },
    flush(controller) {
      buffer += decoder.decode();
      if (buffer.trim()) {
        processLine(buffer, controller);
      }
      buffer = "";
    },
  });
}

function responseFromResult(result: ExecutorExecuteResult): Response {
  return result instanceof Response ? result : result.response;
}

function credentialsFromResult(
  result: ExecutorExecuteResult,
  fallback: ProviderCredentials
): ProviderCredentials {
  if (result instanceof Response || !result.headers) return fallback;

  const authorization = Object.entries(result.headers).find(
    ([name]) => name.toLowerCase() === "authorization"
  )?.[1];
  if (!authorization?.startsWith("Bearer ")) return fallback;

  return {
    ...fallback,
    accessToken: authorization.slice("Bearer ".length),
    expiresAt: undefined,
  };
}

function compactToolDescriptions(body: unknown): unknown | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const request = body as Record<string, unknown>;
  if (!Array.isArray(request.tools) || request.tools.length === 0) return null;

  const originalTools = request.tools;
  try {
    const serializedTools = JSON.stringify(originalTools);
    if (new TextEncoder().encode(serializedTools).byteLength < LARGE_TOOL_METADATA_BYTES) {
      return null;
    }
  } catch {
    return null;
  }

  let tools: unknown[] | null = null;
  originalTools.forEach((tool, index) => {
    if (!tool || typeof tool !== "object" || Array.isArray(tool)) return;

    const declaration = tool as Record<string, unknown>;
    if (
      declaration.type !== "function" ||
      !declaration.function ||
      typeof declaration.function !== "object" ||
      Array.isArray(declaration.function)
    ) {
      return;
    }

    const toolFunction = declaration.function as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(toolFunction, "description")) return;

    const compactFunction = { ...toolFunction };
    delete compactFunction.description;
    tools ??= originalTools.slice();
    tools[index] = { ...declaration, function: compactFunction };
  });

  return tools ? { ...request, tools } : null;
}

async function isSensitiveContentRejection(response: Response): Promise<boolean> {
  if (response.status !== 400) return false;
  const responseText = await response
    .clone()
    .text()
    .catch(() => "");
  return responseText.includes(SENSITIVE_CONTENT_REJECTION);
}

/**
 * CodeBuddyCnExecutor — talks to https://copilot.tencent.com/v2/chat/completions
 *
 * CodeBuddy CN is an OpenAI-compatible Tencent gateway but it rejects non-stream
 * chat requests (HTTP 400, code 11101 "Non-stream chat request is currently not
 * supported"). The same-format (openai→openai) translator path leaves body.stream
 * as the client sent it, so we force it true here — OmniRoute still re-aggregates
 * the SSE into a JSON response for non-streaming clients.
 *
 * Reasoning params are opt-in: reasoning_summary:"auto" is only added when the
 * client explicitly sets reasoning_effort. Plain requests are left untouched.
 * When the caller explicitly asks for "none"/"off" we drop the field entirely
 * (the gateway has no "none" value). Forcing reasoning on plain requests trips
 * CodeBuddy's content filter and returns an error.
 *
 * Agent system prompt replacement: Tencent's content filter flags CLI agent system
 * prompts ("You are Claude Code, Anthropic's official CLI…") as prompt injection /
 * sensitive content and rejects the whole request. Detect agent system prompts
 * (length catch-all + identity-marker regex) and replace them with a neutral one,
 * while leaving legitimate user system prompts untouched. Content may be a string
 * or typed blocks ([{type:"text",text}]) depending on the incoming client format,
 * so flatten before matching and preserve the original shape on replacement.
 */
export class CodeBuddyCnExecutor extends DefaultExecutor {
  constructor() {
    super("codebuddy-cn");
  }

  async execute(input: ExecuteInput): Promise<ExecutorExecuteResult> {
    const result = await super.execute(input);
    const response = responseFromResult(result);
    if (!(await isSensitiveContentRejection(response))) {
      return this.wrapStreamIfPresent(result, response);
    }

    const compactBody = compactToolDescriptions(input.body);
    if (!compactBody) return this.wrapStreamIfPresent(result, response);

    input.log?.debug?.(
      "CODEBUDDY_CN",
      "Upstream rejected an oversized tool request as sensitive content; retrying with compact tool descriptions"
    );
    const retryResult = await super.execute({
      ...input,
      body: compactBody,
      credentials: credentialsFromResult(result, input.credentials),
    });
    return this.wrapStreamIfPresent(retryResult, responseFromResult(retryResult));
  }

  /**
   * CodeBuddy CN returns non-standard SSE frames (empty `tool_calls: []`, degraded
   * tool_calls with empty names, and `finish_reason: ""`) that break VS Code
   * Copilot's tool-calling loop. Wrap the upstream stream with a transform that
   * scrubs those artifacts before they reach OmniRoute's passthrough aggregator.
   *
   * For the bare `Response` arm of `ExecutorExecuteResult` we cannot mutate the
   * body in place without re-reading it, so we only wrap when we hold the richer
   * capture object (the normal HTTP-executor path). The bare-Response arm is only
   * used by non-HTTP executors, which `codebuddy-cn` is not.
   */
  private wrapStreamIfPresent(
    result: ExecutorExecuteResult,
    response: Response
  ): ExecutorExecuteResult {
    if (result instanceof Response) return result;
    if (!response.body) return result;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    const wrapped = new Response(response.body.pipeThrough(createCodeBuddyCnStreamTransform()), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    return { ...result, response: wrapped };
  }

  transformRequest(
    model: string,
    body: unknown,
    stream: boolean,
    credentials: ProviderCredentials
  ): unknown {
    const transformed = super.transformRequest(model, body, stream, credentials);
    if (!transformed || typeof transformed !== "object" || Array.isArray(transformed)) {
      return transformed;
    }
    const out = transformed as Record<string, unknown>;
    out.stream = true;

    const eff = out.reasoning_effort;
    if (eff === "none" || eff === "off") {
      delete out.reasoning_effort;
    } else if (eff) {
      out.reasoning_summary = "auto";
    }

    // --- Agent system prompt replacement ---
    // Tencent's content filter flags CLI agent system prompts as sensitive content.
    // Detect and replace them with a neutral prompt.
    const NEUTRAL_PROMPT =
      "You are a helpful AI assistant that helps with software engineering tasks.";
    const AGENT_PATTERN =
      /you are claude code|claude.?code.+official.+cli|anthropic.+official.+cli|anxthxropic.+official.+cli|you are (?:cursor|windsurf|cline|aider|continue|copilot|cody)|you are an? (?:ai )?(?:coding |code )?agent|cc_entrypoint\s*=\s*(?:cli|vscode|jetbrains|gui)|claude.?code.+issues|give feedback.+claude.?code|you are .{0,30}(?:powerful )?ai agent|orchestration capabilities|OhMyOpenCode|<agent-identity>|<Role>|<Behavior_Instructions>/i;
    const flatten = (content: unknown): string =>
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? (content as Array<Record<string, unknown>>)
              .map((b) => (b && typeof b.text === "string" ? b.text : ""))
              .join("\n")
          : "";

    // Handle top-level `system` field (Anthropic format after translation)
    if (out.system) {
      const text = flatten(out.system);
      if (text && (text.length > 2000 || AGENT_PATTERN.test(text))) {
        out.system = NEUTRAL_PROMPT;
      }
    }

    // Handle messages array with role: "system"
    if (Array.isArray(out.messages)) {
      out.messages = (out.messages as Array<Record<string, unknown>>).map((message) => {
        if (!message || message.role !== "system") return message;
        const text = flatten(message.content);
        if (!text) return message;
        if (text.length > 2000 || AGENT_PATTERN.test(text)) {
          return typeof message.content === "string"
            ? { ...message, content: NEUTRAL_PROMPT }
            : { ...message, content: [{ type: "text", text: NEUTRAL_PROMPT }] };
        }
        return message;
      });
    }

    // --- Strip oversized tool descriptions (>64KB) ---
    // Large tool descriptions can also trigger the content filter.
    if (Array.isArray(out.tools) && out.tools.length > 0) {
      try {
        const s = JSON.stringify(out.tools);
        if (new TextEncoder().encode(s).byteLength >= 65536) {
          out.tools = (out.tools as Array<Record<string, unknown>>).map((tool) => {
            if (!tool || typeof tool !== "object" || Array.isArray(tool)) return tool;
            if (
              tool.type !== "function" ||
              !tool.function ||
              typeof tool.function !== "object" ||
              Array.isArray(tool.function)
            )
              return tool;
            if (!Object.prototype.hasOwnProperty.call(tool.function, "description")) return tool;
            const cf = { ...(tool.function as Record<string, unknown>) };
            delete cf.description;
            return { ...tool, function: cf };
          });
        }
      } catch {}
    }

    return out;
  }
}

export default CodeBuddyCnExecutor;
