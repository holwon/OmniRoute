/**
 * Known context-overflow rejection, extracted from comboStructure.ts to keep
 * that file under the file-size cap (#7177).
 *
 * Fixes: routing a request to a combo whose targets all have a KNOWN (not
 * unknown/fail-open) context window too small for the request used to be
 * discovered only after every target was tried and failed upstream — burning
 * retries/cooldowns on a request that could never succeed. This lets the
 * combo dispatcher reject it up front, before exhausting providers.
 *
 * getKnownContextLimit/hasEstimableContent also
 * live here (moved from comboStructure.ts, same file-size-cap motivation):
 * they are the "how big is a target's known context window" primitives, so
 * they belong next to the overflow check that is their main consumer.
 * comboStructure.ts's own compatibility filter now decides fit via its
 * evaluateContextLimit (#7052); only hasEstimableContent is imported back.
 */

import { getResolvedModelCapabilities } from "../modelCapabilities.ts";
import { isCompressionExcluded, type CompressionExclusions } from "../compression/exclusions.ts";
import { shouldUseNativeCodexPassthrough } from "../../handlers/chatCore/passthroughHelpers.ts";
import { deriveRequestCompatibilityRequirements } from "./comboStructure.ts";
import type { ResolvedComboTarget } from "./types.ts";

export type KnownContextOverflow = {
  estimatedInputTokens: number;
  requestedOutputTokens: number;
  requiredContextTokens: number;
  maxKnownContextTokens: number;
  targetCount: number;
};

export type KnownContextOverflowOptions = {
  clientManagedResponsesContext?: boolean;
  /**
   * When prompt compression is enabled for this request (global compression switch
   * AND not API-key opted-out), defer the hard preflight so chatCore's compression
   * pipeline runs before the final context gate — instead of a raw-body estimate
   * rejecting a compressible request up front. (#10225)
   */
  deferContextOverflowWhenCompressible?: boolean;
  /** Server-side compression exclusions (#8034) — targets matching one cannot run compression. */
  compressionExclusions?: CompressionExclusions;
  /**
   * #10503: the exact request-shape facts chatCore.ts uses to decide
   * `shouldUseNativeCodexPassthrough` (open-sse/handlers/chatCore/passthroughHelpers.ts) —
   * threaded down so the deferral decision below can be target-aware instead of
   * relying on the looser `clientManagedResponsesContext` proxy. Reused verbatim
   * (not re-derived) so the combo-layer decision can never drift from chatCore's own.
   */
  sourceFormat?: string | null;
  endpointPath?: string | null;
  requestHeaders?: Headers | Record<string, unknown> | null;
};

// #7177: an empty array/object (e.g. a default `messages: []` some combo entrypoints inject
// when the caller sent none) has no real content — counting it would charge a few phantom
// "structural" tokens (JSON.stringify braces/brackets) toward the estimate, which is enough
// to falsely trip the exact-boundary known-context-overflow check for a request that has no
// actual input at all.
export function hasEstimableContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

// #7177: known context limit that accounts for the request's own requested
// output tokens — a target whose input+output would together exceed
// maxInputTokens is exactly as incompatible as one whose contextWindow is too
// small, so both bounds go through the same min() so far the tightest wins.
export function getKnownContextLimit(
  capabilities: {
    maxInputTokens?: number | null;
    contextWindow?: number | null;
  },
  requestedOutputTokens = 0
): number | null {
  const limits: number[] = [];
  if (capabilities.maxInputTokens != null) {
    limits.push(capabilities.maxInputTokens + requestedOutputTokens);
  }
  if (capabilities.contextWindow != null) {
    limits.push(capabilities.contextWindow);
  }
  return limits.length > 0 ? Math.min(...limits) : null;
}

/**
 * Return a hard context-overflow decision only when every target has a known
 * context limit and every one of those limits is too small for the request.
 * Unknown metadata deliberately keeps the legacy fail-open behavior.
 */
export function getKnownContextOverflow(
  targets: ResolvedComboTarget[],
  body: Record<string, unknown>,
  options: KnownContextOverflowOptions = {}
): KnownContextOverflow | null {
  if (targets.length === 0) return null;
  // Native Codex Responses clients compact their own item history. Let the concrete
  // Codex target enforce its effective context limit (including operator overrides)
  // instead of rejecting early against a smaller catalog hint. Keep this scoped to
  // pools made exclusively from native Codex-capable targets so other Responses
  // clients/providers retain the hard preflight.
  if (
    options.clientManagedResponsesContext === true &&
    targets.every(
      (target) => target.provider === "codex" || target.provider === "chatgpt-web-codex"
    )
  ) {
    return null;
  }
  // #10225 / #10499-sweep #10503: a conservative raw-body context estimate must not
  // be treated as proof that a compression-enabled request cannot fit. When
  // compression is available for this request AND at least one target can actually
  // run it, defer the hard rejection so handleChatCore runs proactive compression
  // (chatCore.ts) and its post-compression enforceOutputTokenBudget becomes the
  // final context gate — returning a local `context_length_exceeded` only if the
  // compressed body still cannot fit (no upstream dispatch).
  //
  // Target-awareness is load-bearing here: a target is only a valid reason to defer
  // when handleChatCore will ACTUALLY attempt compression for it. Two classes are
  // excluded from "can compress" even though `isCompressionExcluded` (operator
  // exclusions) says nothing about them:
  //   - Operator-excluded targets (#8034, existing `isCompressionExcluded` check).
  //   - Native Codex Responses passthrough targets: chatCore.ts unconditionally sets
  //     `compressionExcluded = nativeCodexPassthrough || ...` for these, computed via
  //     `shouldUseNativeCodexPassthrough()` (chatCore/passthroughHelpers.ts) — called
  //     here with the SAME request-shape facts (sourceFormat/endpointPath/headers)
  //     chatCore itself uses, reused verbatim rather than re-derived from the looser
  //     `clientManagedResponsesContext` flag (which always requires a VERIFIED native
  //     client; chatCore's own gate does NOT for provider==="codex" — see
  //     shouldUseNativeCodexPassthrough's `provider === "codex" || isVerifiedNativeCodexRequest`
  //     short-circuit). Deferring on such a target's account would let an oversized
  //     body sail straight through to `fetch()` uncompressed instead of being caught
  //     by either preflight — silently defeating the whole point of this feature.
  // If NO target can compress, the fast raw-body preflight is kept (unchanged).
  if (
    options.deferContextOverflowWhenCompressible === true &&
    targets.some((target) => {
      const isNativeCodexPassthroughTarget = shouldUseNativeCodexPassthrough({
        provider: target.provider,
        sourceFormat: options.sourceFormat,
        endpointPath: options.endpointPath,
        body,
        headers: options.requestHeaders,
      });
      if (isNativeCodexPassthroughTarget) return false;
      return !isCompressionExcluded(
        {
          provider: target.provider,
          model: target.modelStr.includes("/")
            ? target.modelStr.split("/").slice(1).join("/")
            : target.modelStr,
        },
        options.compressionExclusions
      );
    })
  ) {
    return null;
  }
  const requirements = deriveRequestCompatibilityRequirements(body);
  if (requirements.requiredContextTokens <= 0) return null;

  const limits = targets.map((target) =>
    getKnownContextLimit(
      getResolvedModelCapabilities(target.modelStr),
      requirements.requestedOutputTokens
    )
  );
  if (limits.some((limit) => limit === null)) return null;

  const knownLimits = limits as number[];
  const maxKnownContextTokens = Math.max(...knownLimits);
  if (maxKnownContextTokens >= requirements.requiredContextTokens) return null;

  return {
    estimatedInputTokens: requirements.estimatedInputTokens,
    requestedOutputTokens: requirements.requestedOutputTokens,
    requiredContextTokens: requirements.requiredContextTokens,
    maxKnownContextTokens,
    targetCount: targets.length,
  };
}
