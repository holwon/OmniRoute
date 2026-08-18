/**
 * OmniGlyph — compressão contexto-como-imagem para os wires Anthropic e OpenAI.
 * A versão 1.3.x do pacote também traz transformadores nativos para Chat
 * Completions e Responses; o adaptador escolhe o transformador pelo formato do
 * provider, nunca pelo formato que o cliente usou na entrada.
 *
 * GATES (todos fail-closed; cada skip vira técnica `skip:<motivo>` nos stats):
 *  - supportsVision !== true            → skip:no_vision
 *  - modelo fora da allowlist medida    → skip:model_not_approved
 *  - providerTransport !== 'direct'     → skip:transport_not_direct
 *    (agregadores redimensionam imagens e destroem a legibilidade — medido)
 *  - wire não é Claude/OpenAI suportado → skip:target_format_not_supported
 *  - gate de rentabilidade interno do omniglyph decide o resto (patches 28px
 *    exatos; texto esparso/pequeno passa direto) → skip:not_profitable
 *
 * `sampling: true`: perda é INTENCIONAL (byte-exatos viajam no factsheet em
 * texto) — o fidelity gate pula esta engine por design, não por acidente.
 */
import type { CompressionEngine, CompressionEngineApplyOptions } from "./types.ts";
import type { CompressionResult } from "../types.ts";
import { createCompressionStats } from "../stats.ts";
import {
  isOmniGlyphSupportedGptModel,
  isOmniGlyphSupportedModel,
  transformAnthropicMessages,
  transformOpenAIChatCompletions,
  transformOpenAIResponses,
} from "omniglyph";
import { isModelImageable } from "omniglyph/applicability";

function skip(body: Record<string, unknown>, reason: string): CompressionResult {
  try {
    return {
      body,
      compressed: false,
      stats: createCompressionStats(body, body, "stacked", [`skip:${reason}`]),
    };
  } catch {
    // Fail-open guard: a non-serializable body (e.g. circular reference) makes
    // createCompressionStats' internal JSON.stringify throw too — stats become
    // best-effort telemetry, never a reason to propagate the error.
    return { body, compressed: false, stats: null };
  }
}

type OmniGlyphWireFormat = "claude" | "openai" | "openai-responses";

/** Formato Claude nativo: system no topo, nunca role:"system" dentro de messages. */
function isClaudeFormat(body: Record<string, unknown>): boolean {
  const messages = body.messages;
  if (!Array.isArray(messages)) return false;
  return !messages.some((m) => (m as { role?: string } | null)?.role === "system");
}

function inferWireFormat(body: Record<string, unknown>): OmniGlyphWireFormat {
  if (Array.isArray(body.input) || typeof body.instructions === "string") {
    return "openai-responses";
  }
  if (!isClaudeFormat(body)) return "openai";
  return "claude";
}

function resolveWireFormat(
  body: Record<string, unknown>,
  options?: CompressionEngineApplyOptions
): OmniGlyphWireFormat | null {
  const stage = options?.compressionStage ?? "pre-translation";
  const requested = stage === "post-translation" ? options?.targetFormat : options?.sourceFormat;
  if (requested === "claude" || requested === "openai" || requested === "openai-responses") {
    return requested;
  }
  if (requested) return null;
  return inferWireFormat(body);
}

async function applyOmniglyph(
  body: Record<string, unknown>,
  options?: CompressionEngineApplyOptions
): Promise<CompressionResult> {
  const model = options?.model ?? (body as { model?: string }).model ?? "";
  if (options?.supportsVision !== true) return skip(body, "no_vision");
  if (options?.providerTransport !== "direct") return skip(body, "transport_not_direct");

  const stage = options?.compressionStage ?? "pre-translation";
  const wireFormat = resolveWireFormat(body, options);
  // The pre-translation lane is retained for the existing native Claude
  // passthrough. OpenAI requests must wait until translation has produced the
  // exact provider wire, otherwise Responses input[] would be flattened by the
  // generic compression adapter and lose native tool/reasoning items.
  if (stage === "pre-translation" && wireFormat !== "claude") {
    return skip(body, "requires_post_translation");
  }
  if (!wireFormat) return skip(body, "target_format_not_supported");
  if (wireFormat === "claude" && !isClaudeFormat(body)) {
    return skip(body, "source_format_not_claude");
  }
  if (wireFormat === "openai" && !Array.isArray(body.messages)) {
    return skip(body, "source_format_not_openai");
  }
  if (
    wireFormat === "openai-responses" &&
    !Array.isArray(body.input) &&
    typeof body.input !== "string"
  ) {
    return skip(body, "source_format_not_openai_responses");
  }
  const supportedModel =
    wireFormat === "claude"
      ? isOmniGlyphSupportedModel(model)
      : isOmniGlyphSupportedGptModel(model);
  if (!supportedModel) return skip(body, "model_not_approved");
  // OmniGlyph 1.3.x deliberately keeps unverified families (currently Grok)
  // text-only until the operator acknowledges them via its own env gate.
  if (!isModelImageable(model)) return skip(body, "model_not_imageable");

  const started = Date.now();
  let outBody: Record<string, unknown>;
  try {
    const encoded = new TextEncoder().encode(JSON.stringify(body));
    const result =
      wireFormat === "claude"
        ? await transformAnthropicMessages({ body: encoded, model })
        : wireFormat === "openai"
          ? await transformOpenAIChatCompletions(encoded)
          : await transformOpenAIResponses(encoded);
    const applied = wireFormat === "claude" ? result.applied : result.info.compressed;
    if (!applied) return skip(body, result.info?.reason ?? "not_profitable");
    outBody = JSON.parse(new TextDecoder().decode(result.body)) as Record<string, unknown>;
  } catch {
    // Fail-open: qualquer erro no encode/transform/decode (ex.: corpo não serializável,
    // render PNG estourando, JSON decodificado malformado) vira skip, nunca propaga.
    return skip(body, "transform_error");
  }

  return {
    body: outBody,
    compressed: true,
    stats: createCompressionStats(
      body,
      outBody,
      "stacked",
      ["omniglyph:context-as-image"],
      undefined,
      Date.now() - started
    ),
  };
}

export const omniglyphEngine: CompressionEngine = {
  id: "omniglyph",
  name: "OmniGlyph",
  description:
    "Contexto-como-imagem (Anthropic Fable 5, rota direta): system prompt, tool docs e histórico viram páginas PNG densas — ~10× menos tokens no bloco convertido.",
  icon: "image",
  targets: ["messages", "tool_results"],
  stackable: true,
  stackPriority: 90, // por último: RTK/Caveman limpam texto antes; omniglyph imageia o residual
  sampling: true, // perda intencional + factsheet → fidelity gate pula por design
  metadata: {
    id: "omniglyph",
    name: "OmniGlyph",
    description:
      "Contexto-como-imagem para Claude Fable 5 e GPT 5.6 via wires nativos Anthropic/OpenAI em rota direta.",
    inputScope: "mixed",
    targetLatencyMs: 250, // render+encode PNG de páginas grandes
    supportsPreview: true,
    stable: false, // P1: preview — promover após o e2e P3 (30/30 via OmniRoute)
    executionStages: ["pre-translation", "post-translation"],
  },
  // Contrato da interface: engines async-only mantêm apply síncrono como pass-through seguro.
  apply(body) {
    return { body, compressed: false, stats: null };
  },
  applyAsync: applyOmniglyph,
  compress(body, config) {
    return this.apply(body, { stepConfig: config });
  },
  getConfigSchema() {
    return [];
  },
  validateConfig() {
    return { valid: true, errors: [] };
  },
};
