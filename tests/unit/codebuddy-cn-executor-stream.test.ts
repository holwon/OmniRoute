/**
 * CodeBuddy CN 畸形 SSE 流回归测试 — 验证 CodeBuddyCnExecutor 在 passthrough
 * 聚合之前清洗三个非标准行为 (见参考项目 proxy.js 差异对照表):
 *
 *   1. 每个 delta chunk 都带 "tool_calls": [] 空数组 (即使不调工具) — 必须删除
 *   2. 带 tools 的请求里, 某些 chunk 夹带退化 tool_call (只有 index, name 为空)
 *      → 会产生 name 为空的 tool_calls → VS Code 无法解析 → 报 unknown 并无限重试
 *   3. finish_reason 返回 "" 空字符串 (非标准) → 统一转 null
 *
 * 此测试通过 mock 上游 fetch 返回畸形 SSE 流, 调用 CodeBuddyCnExecutor.execute(),
 * 然后断言清洗后的流不含退化 tool_calls、空 tool_calls 数组, 且 finish_reason 归一。
 *
 * 运行: node --import tsx/esm --test tests/unit/codebuddy-cn-executor-stream.test.ts
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CodeBuddyCnExecutor } from "../../open-sse/executors/codebuddy-cn.ts";

const textEncoder = new TextEncoder();

// 模拟 CodeBuddy 网关返回的畸形 SSE 流
function mockCodeBuddyStream(chunks: string[]): Response {
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(textEncoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

// 从 SSE 响应中提取所有 data: 帧的 JSON 对象
async function collectFrames(response: Response): Promise<Array<Record<string, unknown>>> {
  const text = await response.text();
  const frames: Array<Record<string, unknown>> = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) continue;
    const payload = trimmed.slice(6);
    if (payload === "[DONE]") continue;
    try {
      frames.push(JSON.parse(payload) as Record<string, unknown>);
    } catch {
      // skip non-JSON
    }
  }
  return frames;
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = (async () => mockCodeBuddyStream([])) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("CodeBuddyCnExecutor SSE stream cleaning", () => {
  it("strips empty tool_calls: [] arrays and degraded (empty-name) tool_calls, normalizes finish_reason", async () => {
    const executor = new CodeBuddyCnExecutor();
    const chunks = [
      // 首帧: 带空 tool_calls[] 和空 finish_reason
      `data: ${JSON.stringify({ id: "cb-1", choices: [{ index: 0, delta: { role: "assistant", content: "", tool_calls: [] }, finish_reason: "" }] })}\n\n`,
      // 内容帧: 真实文本 + 退化 tool_call (只有 index, name/arguments 为空)
      `data: ${JSON.stringify({ id: "cb-1", choices: [{ index: 0, delta: { content: "Let me help.", tool_calls: [{ index: 0, id: "", type: "function", function: { name: "", arguments: "" } }] }, finish_reason: "" }] })}\n\n`,
      // 结束帧: 空 finish_reason
      `data: ${JSON.stringify({ id: "cb-1", choices: [{ index: 0, delta: {}, finish_reason: "" }] })}\n\n`,
      `data: [DONE]\n\n`,
    ];

    globalThis.fetch = (async () => mockCodeBuddyStream(chunks)) as typeof fetch;

    const result = await executor.execute({
      model: "cbcn/deepseek-v4-flash",
      body: {
        messages: [{ role: "user", content: "hi" }],
        tools: [
          { type: "function", function: { name: "read_file", description: "x", parameters: {} } },
        ],
      },
      stream: true,
      credentials: { accessToken: "test-token" },
      signal: null,
    });

    const response = result instanceof Response ? result : result.response;
    const frames = await collectFrames(response);

    // 断言 1: 没有任何帧的 delta 携带空 tool_calls 数组
    for (const frame of frames) {
      const delta = (frame.choices?.[0] as Record<string, unknown>)?.delta as
        Record<string, unknown> | undefined;
      if (delta?.tool_calls !== undefined) {
        assert.ok(
          Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0,
          "不应保留空 tool_calls 数组"
        );
      }
    }

    // 断言 2: 没有任何 tool_call 的 name 为空 (退化对象必须被过滤)
    for (const frame of frames) {
      const delta = (frame.choices?.[0] as Record<string, unknown>)?.delta as
        Record<string, unknown> | undefined;
      if (Array.isArray(delta?.tool_calls)) {
        for (const tc of delta!.tool_calls as Array<Record<string, unknown>>) {
          const name = (tc.function as Record<string, unknown>)?.name;
          assert.notStrictEqual(name, "", "退化 tool_call (name 为空) 必须被过滤");
          assert.ok(
            typeof name === "string" && name.trim().length > 0,
            "保留的 tool_call 必须有真实 name"
          );
        }
      }
    }

    // 断言 3: finish_reason 不应是空字符串 (应被归一为 null 或由 passthrough 补 stop)
    for (const frame of frames) {
      const fr = (frame.choices?.[0] as Record<string, unknown>)?.finish_reason;
      assert.notStrictEqual(fr, "", "finish_reason 空字符串必须被归一");
    }

    // 断言 4: 最终聚合的 finish_reason 应为 stop (纯文本回复, 无真实工具调用)
    const lastFrame = frames[frames.length - 1];
    const finalFinish = (lastFrame.choices?.[0] as Record<string, unknown>)?.finish_reason;
    assert.ok(
      finalFinish === "stop" || finalFinish === null,
      `最终 finish_reason 应为 stop 或 null, 实际: ${String(finalFinish)}`
    );
  });

  it("preserves a real tool_call (non-empty name) intact through the stream", async () => {
    const executor = new CodeBuddyCnExecutor();
    const chunks = [
      `data: ${JSON.stringify({ id: "cb-2", choices: [{ index: 0, delta: { role: "assistant", tool_calls: [{ index: 0, id: "call_abc", type: "function", function: { name: "read_file", arguments: '{"path":"/tmp/a"}' } }] }, finish_reason: "" }] })}\n\n`,
      `data: ${JSON.stringify({ id: "cb-2", choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '"}' } }] }, finish_reason: "" }] })}\n\n`,
      `data: ${JSON.stringify({ id: "cb-2", choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] })}\n\n`,
      `data: [DONE]\n\n`,
    ];

    globalThis.fetch = (async () => mockCodeBuddyStream(chunks)) as typeof fetch;

    const result = await executor.execute({
      model: "cbcn/glm-5.2",
      body: {
        messages: [{ role: "user", content: "read /tmp/a" }],
        tools: [
          { type: "function", function: { name: "read_file", description: "x", parameters: {} } },
        ],
      },
      stream: true,
      credentials: { accessToken: "test-token" },
      signal: null,
    });

    const response = result instanceof Response ? result : result.response;
    const frames = await collectFrames(response);

    // 真实 tool_call 必须被完整保留
    const hasRealToolCall = frames.some((frame) => {
      const delta = (frame.choices?.[0] as Record<string, unknown>)?.delta as
        Record<string, unknown> | undefined;
      return Array.isArray(delta?.tool_calls) && delta!.tool_calls.length > 0;
    });
    assert.ok(hasRealToolCall, "真实 tool_call (有 name) 必须被保留");

    // 验证至少有一个 tool_call 带有 read_file name
    const foundReadFile = frames.some((frame) => {
      const delta = (frame.choices?.[0] as Record<string, unknown>)?.delta as
        Record<string, unknown> | undefined;
      return (
        Array.isArray(delta?.tool_calls) &&
        (delta!.tool_calls as Array<Record<string, unknown>>).some(
          (tc) => (tc.function as Record<string, unknown>)?.name === "read_file"
        )
      );
    });
    assert.ok(foundReadFile, "read_file tool_call 的 name 必须保留");
  });
});
