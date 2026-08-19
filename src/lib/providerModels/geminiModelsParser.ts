/**
 * Parses the Google Generative Language `v1beta/models` listing into discovery models.
 *
 * Each model's `supportedGenerationMethods` is mapped to OmniRoute endpoints:
 *   - generateContent / generateAnswer → "chat"
 *   - predictLongRunning               → "video"   (Veo video generation)
 *   - embedContent                     → "embeddings"
 *   - bidiGenerateContent              → "audio"   (Live real-time audio)
 *
 * Model-id heuristics ensure Veo models remain in the video bucket.
 *
 * Note: `gemini-*-image` models (e.g. gemini-3-pro-image) generate images via the
 * regular `generateContent` path, so they stay "chat" (image output is a chat
 * modality) and are intentionally NOT reclassified as "images".
 *
 * This is shared by the `gemini` discovery config and the `vertex` /
 * `vertex-partner` (incl. Vertex AI Express key) discovery branches, so every
 * model the account can access — chat, image, video, audio and embeddings —
 * surfaces dynamically instead of being limited to the small static registry.
 */
const METHOD_TO_ENDPOINT: Record<string, string> = {
  generateContent: "chat",
  embedContent: "embeddings",
  predictLongRunning: "video",
  bidiGenerateContent: "audio",
  generateAnswer: "chat",
};

const IGNORED_METHODS = new Set([
  "countTokens",
  "countTextTokens",
  "createCachedContent",
  "batchGenerateContent",
  "asyncBatchEmbedContent",
]);

export interface GeminiDiscoveryModel {
  id: string;
  name: string;
  supportedEndpoints: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  description?: string;
  supportsThinking?: boolean;
  [key: string]: unknown;
}

export function parseGeminiModelsList(data: any): GeminiDiscoveryModel[] {
  return (data?.models || []).map((m: Record<string, unknown>) => {
    const methods: string[] = Array.isArray(m.supportedGenerationMethods)
      ? (m.supportedGenerationMethods as string[])
      : [];

    const endpoints = new Set<string>(
      methods
        .filter((method) => !IGNORED_METHODS.has(method))
        .map((method) => METHOD_TO_ENDPOINT[method] || "chat")
    );

    const id = ((m.name as string) || (m.id as string) || "").replace(/^models\//, "");
    const lowerId = id.toLowerCase();

    // Keep Veo models in the video bucket even when the method list is incomplete.
    if (lowerId.includes("veo")) {
      endpoints.add("video");
    }

    if (endpoints.size === 0) endpoints.add("chat");

    return {
      ...m,
      id,
      name: (m.displayName as string) || id,
      supportedEndpoints: [...endpoints],
      ...(typeof m.inputTokenLimit === "number" ? { inputTokenLimit: m.inputTokenLimit } : {}),
      ...(typeof m.outputTokenLimit === "number" ? { outputTokenLimit: m.outputTokenLimit } : {}),
      ...(typeof m.description === "string" ? { description: m.description } : {}),
      ...(m.thinking === true ? { supportsThinking: true } : {}),
    } as GeminiDiscoveryModel;
  });
}
