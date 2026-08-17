/**
 * Pure, network-free decision for the proxy health scheduler (#6246).
 *
 * Separated from the sweep so the status/removal policy can be unit-tested
 * exhaustively without any I/O. The sweep classifies each probe into a tri-state
 * {@link ProxyProbeOutcome} and applies the returned {@link ProxyHealthDecision}.
 *
 * Policy (agreed for #6246, extended for the auto-disable mode below):
 *   A — downgrade only after `removeAfter` CONSECUTIVE conclusive failures.
 *   B — an `inconclusive` probe (our own timeout/abort, or the probe TARGET
 *       erroring) never penalizes: it neither counts nor changes status.
 *   C — by DEFAULT (both auto-remove and auto-disable off) the health check
 *       NEVER mutates a proxy's status. It only counts failures for logging.
 *       A proxy's status is only touched once the operator opts in via
 *       PROXY_AUTO_REMOVE=true or PROXY_AUTO_DISABLE=true. This mirrors how
 *       accounts are only auto-disabled when the operator allows it — the
 *       operator owns their (often paid) proxies.
 *   D — PROXY_AUTO_DISABLE=true is the non-destructive sibling of
 *       PROXY_AUTO_REMOVE: at the same consecutive-failure threshold it writes
 *       `status: "dead"` instead of deleting the row. `"dead"` is already one
 *       of the statuses PROXY_ALIVE_PREDICATE excludes (src/lib/db/proxies/guards.ts),
 *       so a disabled proxy drops out of pool/rotation resolution immediately
 *       with no other code changes. Because the sweep keeps probing every
 *       registered proxy regardless of status, a "dead" proxy that starts
 *       answering again is picked back up by the same `outcome === "ok"`
 *       branch that already re-activates proxies for auto-remove — recovery
 *       is free once autoDisable participates in `managesStatus` below. If
 *       both flags are set, auto-remove (destructive) wins: a proxy that is
 *       about to be deleted has no use for a soft-disable in between.
 */

export type ProxyProbeOutcome = "ok" | "fail" | "inconclusive";

export interface ProxyHealthDecisionInput {
  /** Tri-state result of the reachability probe for this proxy. */
  outcome: ProxyProbeOutcome;
  /** Consecutive failure count recorded BEFORE this probe. */
  priorFailures: number;
  /** PROXY_AUTO_REMOVE === "true" — operator opted into delete-on-death. */
  autoRemove: boolean;
  /**
   * PROXY_AUTO_DISABLE === "true" — operator opted into soft-disable-on-death
   * (status "dead", never deleted). Optional/defaults to `false` so existing
   * callers that predate this flag keep their exact prior behavior.
   */
  autoDisable?: boolean;
  /** Consecutive conclusive failures required before a downgrade/removal. */
  removeAfter: number;
}

export interface ProxyHealthDecision {
  /** New consecutive-failure count to persist for this proxy. */
  failures: number;
  /** Whether to drop this proxy from the consecutive-failure map. */
  clearFailures: boolean;
  /** Status to write, or `null` to leave the operator-controlled status untouched. */
  setStatus: "active" | "inactive" | "dead" | null;
  /** Whether to auto-remove the proxy (only ever true when autoRemove is on). */
  remove: boolean;
}

export function decideProxyHealthAction(input: ProxyHealthDecisionInput): ProxyHealthDecision {
  const { outcome, priorFailures, autoRemove, autoDisable = false, removeAfter } = input;
  const threshold = Number.isFinite(removeAfter) && removeAfter > 0 ? removeAfter : 3;
  // Either opt-in flag hands status control from the operator to the sweep.
  const managesStatus = autoRemove || autoDisable;

  // B: inconclusive probes are neutral — do not touch count or status.
  if (outcome === "inconclusive") {
    return { failures: priorFailures, clearFailures: false, setStatus: null, remove: false };
  }

  // Success: reset the streak. Only (re)assert "active" when the operator has
  // opted into status management; otherwise never touch the user's status (C).
  if (outcome === "ok") {
    return {
      failures: 0,
      clearFailures: true,
      setStatus: managesStatus ? "active" : null,
      remove: false,
    };
  }

  // Conclusive failure.
  const failures = priorFailures + 1;

  // C: default mode only counts/logs — never downgrades.
  if (!managesStatus) {
    return { failures, clearFailures: false, setStatus: null, remove: false };
  }

  // A/D: act only once the consecutive threshold is reached. Auto-remove
  // (destructive) takes precedence over auto-disable when both are enabled.
  if (failures >= threshold) {
    if (autoRemove) {
      return { failures, clearFailures: false, setStatus: "inactive", remove: true };
    }
    return { failures, clearFailures: false, setStatus: "dead", remove: false };
  }

  return { failures, clearFailures: false, setStatus: null, remove: false };
}
