import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EMPTY_POOL_WARN_INTERVAL_MS,
  resetEmptyAutoPoolWarnStateForTests,
  warnEmptyAutoPoolOnce,
} from "../../open-sse/services/autoCombo/virtualFactory.ts";

test("warnEmptyAutoPoolOnce emits at most once per label per interval", () => {
  resetEmptyAutoPoolWarnStateForTests();
  const t0 = 1_000_000;
  assert.equal(warnEmptyAutoPoolOnce("auto/zai", "empty", t0), true);
  assert.equal(warnEmptyAutoPoolOnce("auto/zai", "empty", t0 + 1), false);
  assert.equal(warnEmptyAutoPoolOnce("auto/zai", "empty", t0 + EMPTY_POOL_WARN_INTERVAL_MS - 1), false);
  assert.equal(warnEmptyAutoPoolOnce("auto/other", "empty", t0 + 1), true);
  assert.equal(warnEmptyAutoPoolOnce("auto/zai", "empty", t0 + EMPTY_POOL_WARN_INTERVAL_MS), true);
});
