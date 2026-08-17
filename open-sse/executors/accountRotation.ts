/**
 * Shared multi-account rotation mechanics for noauth executors that round-robin
 * across several "accounts" (fingerprints), each with an optional dedicated
 * proxy — currently `OpencodeExecutor` and `MimocodeExecutor`.
 *
 * Extracted after both executors independently implemented the same
 * pickAccount/markCooldown/markSuccess skeleton with the same exponential
 * backoff, and independently needed the same fix for the same latent bug (a
 * network exception was treated as account-scoped rotation fodder even for
 * accounts sharing the default egress — see `isNetworkErrorRotatable`).
 */

// Reuses the repo's established "transient, not clearly attributable" failure
// cooldown (already used by accountFallback.ts for network-error dedup, see
// its "one transient blip opens the whole-provider breaker" comment) instead
// of inventing a separate constant — same magnitude the codebase already
// applies whether the failure is a 429 or a network-level throw.
import { TRANSIENT_COOLDOWN_MS, COOLDOWN_MS } from "../config/errorConfig.ts";

/** Per-account proxy configuration, persisted by NoAuthAccountCard under
 * `providerSpecificData.accountProxies` (keyed by the account id, which the UI
 * stores in `providerSpecificData.fingerprints`). */
export interface AccountProxyConfig {
  fingerprint: string;
  proxy: {
    type: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    relayAuth?: string;
  } | null;
}

/** The subset of per-account state the rotation mechanics need. Executors may
 * carry additional fields (e.g. mimocode's `jwt`/`expiresAt`) — this is the
 * minimum shape `pickAccount`/`markCooldown`/`markSuccess` operate on. */
export interface RotatableAccount {
  fingerprint: string;
  cooldownUntil: number;
  consecutiveFails: number;
  proxy: AccountProxyConfig["proxy"];
}

const COOLDOWN_BASE_MS = TRANSIENT_COOLDOWN_MS;
const COOLDOWN_MAX_MS = COOLDOWN_MS.transientMax;

export function isAccountReady(account: RotatableAccount): boolean {
  return account.cooldownUntil <= Date.now();
}

/** Round-robin pick, skipping accounts not `isReady`; falls back to the next
 * index (even if not ready) so a caller always gets an account rather than
 * hanging when every account is unavailable. Mutates `state.nextAccountIdx`.
 *
 * `isReady` defaults to the plain cooldown check (`isAccountReady`); pass a
 * custom predicate when readiness depends on more than cooldown (e.g.
 * mimocode's JWT-freshness-aware variant). */
export function pickAccount<T extends RotatableAccount>(
  accounts: T[],
  state: { nextAccountIdx: number },
  isReady: (account: T) => boolean = isAccountReady
): T {
  for (let i = 0; i < accounts.length; i++) {
    const idx = (state.nextAccountIdx + i) % accounts.length;
    const acct = accounts[idx];
    if (isReady(acct)) {
      state.nextAccountIdx = (idx + 1) % accounts.length;
      return acct;
    }
  }
  const fallbackIdx = state.nextAccountIdx % accounts.length;
  state.nextAccountIdx = (state.nextAccountIdx + 1) % accounts.length;
  return accounts[fallbackIdx];
}

export function markCooldown(account: RotatableAccount): void {
  account.consecutiveFails++;
  const backoff = Math.min(
    COOLDOWN_BASE_MS * Math.pow(2, account.consecutiveFails - 1),
    COOLDOWN_MAX_MS
  );
  account.cooldownUntil = Date.now() + backoff + Math.random() * 1000;
}

export function markSuccess(account: RotatableAccount): void {
  account.consecutiveFails = 0;
}

/** Mask an account id for logs (UI calls it a fingerprint). */
export function maskAccountId(fingerprint: string): string {
  if (!fingerprint) return "direct";
  return `${fingerprint.slice(0, 8)}…`;
}

/**
 * Whether a network exception (timeout, connection refused/reset) on this
 * account should trigger rotation to the next account, vs propagating.
 *
 * Only true when the account has its own egress (a configured proxy) — that's
 * the case a dead/unreachable proxy genuinely justifies rotating away from.
 * Accounts sharing the default egress (no proxy) can all fail at once on a
 * real network outage: rotating there would just retry the same failure
 * against every account while poisoning each one's cooldown for a cause that
 * isn't theirs.
 */
export function isNetworkErrorRotatable(account: RotatableAccount): boolean {
  return account.proxy !== null;
}
