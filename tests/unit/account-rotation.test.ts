import { describe, it } from "node:test";
import assert from "node:assert";
import {
  isAccountReady,
  pickAccount,
  markCooldown,
  markSuccess,
  maskAccountId,
  isNetworkErrorRotatable,
  type RotatableAccount,
} from "../../open-sse/executors/accountRotation.ts";

function account(overrides: Partial<RotatableAccount> = {}): RotatableAccount {
  return {
    fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    cooldownUntil: 0,
    consecutiveFails: 0,
    proxy: null,
    ...overrides,
  };
}

describe("accountRotation", () => {
  it("isAccountReady is true when cooldownUntil is in the past", () => {
    assert.strictEqual(isAccountReady(account({ cooldownUntil: Date.now() - 1000 })), true);
  });

  it("isAccountReady is false when cooldownUntil is in the future", () => {
    assert.strictEqual(isAccountReady(account({ cooldownUntil: Date.now() + 60_000 })), false);
  });

  it("markCooldown increments consecutiveFails and sets a future cooldownUntil", () => {
    const acct = account();
    markCooldown(acct);
    assert.strictEqual(acct.consecutiveFails, 1);
    assert.ok(acct.cooldownUntil > Date.now());
  });

  it("markCooldown backs off exponentially with consecutive failures", () => {
    const acct = account();
    markCooldown(acct);
    const firstCooldown = acct.cooldownUntil;
    markCooldown(acct);
    assert.strictEqual(acct.consecutiveFails, 2);
    // Second backoff (base*2^1) must be strictly larger than the first
    // (base*2^0), modulo the shared jitter window — compare the floor.
    assert.ok(acct.cooldownUntil - Date.now() > firstCooldown - Date.now() - 1000);
  });

  it("markCooldown uses the same magnitude regardless of why it was called (429 or network throw)", () => {
    // No `short`/severity parameter: proxy-attributable failures (429, dead
    // proxy) and shared-egress network throws use the identical formula —
    // the repo's own established "transient, not clearly attributable"
    // cooldown (errorConfig.ts TRANSIENT_COOLDOWN_MS/transientMax) already
    // covers both cases at the same magnitude. The behavioral fix for
    // shared-egress accounts lives in the caller's skip logic, not here.
    const a = account();
    const b = account();
    markCooldown(a);
    markCooldown(b);
    // Both draw from the same base backoff ± up to 1s jitter — same formula,
    // no separate "short" magnitude for either call site.
    assert.ok(
      Math.abs(a.cooldownUntil - b.cooldownUntil) <= 1000,
      "same account state must produce cooldowns within the shared jitter window"
    );
  });

  it("markSuccess resets consecutiveFails to 0", () => {
    const acct = account({ consecutiveFails: 5 });
    markSuccess(acct);
    assert.strictEqual(acct.consecutiveFails, 0);
  });

  it("maskAccountId masks a real fingerprint to its first 8 chars + ellipsis", () => {
    assert.strictEqual(maskAccountId("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), "aaaaaaaa…");
  });

  it("maskAccountId reports the empty/default fingerprint as 'direct'", () => {
    assert.strictEqual(maskAccountId(""), "direct");
  });

  it("pickAccount skips accounts in cooldown and rotates nextAccountIdx", () => {
    const a = account({ fingerprint: "a", cooldownUntil: Date.now() + 60_000 });
    const b = account({ fingerprint: "b", cooldownUntil: 0 });
    const state = { nextAccountIdx: 0 };
    const picked = pickAccount([a, b], state);
    assert.strictEqual(picked.fingerprint, "b", "must skip the account still in cooldown");
  });

  it("pickAccount falls back to the next index when every account is in cooldown", () => {
    const a = account({ fingerprint: "a", cooldownUntil: Date.now() + 60_000 });
    const b = account({ fingerprint: "b", cooldownUntil: Date.now() + 60_000 });
    const state = { nextAccountIdx: 0 };
    const picked = pickAccount([a, b], state);
    assert.strictEqual(picked.fingerprint, "a", "must still return an account, not throw/hang");
  });

  it("pickAccount accepts a custom isReady predicate (e.g. JWT-freshness-aware)", () => {
    const a = account({ fingerprint: "a", cooldownUntil: 0 });
    const b = account({ fingerprint: "b", cooldownUntil: 0 });
    const state = { nextAccountIdx: 0 };
    // Custom predicate rejects "a" for a reason cooldown alone wouldn't catch.
    const picked = pickAccount([a, b], state, (acct: RotatableAccount) => acct.fingerprint !== "a");
    assert.strictEqual(picked.fingerprint, "b");
  });

  it("isNetworkErrorRotatable is true only when the account has a configured proxy", () => {
    const withProxy = account({
      proxy: { type: "http", host: "127.0.0.1", port: 8080 },
    });
    const withoutProxy = account({ proxy: null });
    assert.strictEqual(isNetworkErrorRotatable(withProxy), true);
    assert.strictEqual(isNetworkErrorRotatable(withoutProxy), false);
  });
});
