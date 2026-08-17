// Regression test for #10286: gemini-3.5-flash was incorrectly marked
// supportsThinking:false, causing a spurious pre-provider HTTP 400 for any
// request with reasoning_effort set, even though the base Google AI Studio
// model supports reasoning (it has an effort-tier alias gemini-3.5-flash-high).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-repro-10286-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || "test-repro-10286-secret";

const caps = await import("../../src/lib/modelCapabilities.ts");
const core = await import("../../src/lib/db/core.ts");
const rulesDb = await import("../../src/lib/db/reasoningRoutingRules.ts");
const policy = await import("../../src/lib/reasoningRouting/policy.ts");

async function resetStorage() {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  rulesDb.invalidateReasoningRoutingRuleCache();
}

function ruleInput(patch: Record<string, unknown> = {}) {
  return {
    name: "Enable thinking on gemini-3.5-flash",
    description: "",
    scope: "global",
    apiKeyId: null,
    comboId: null,
    connectionId: null,
    modelPattern: "gemini-3.5-flash",
    sourceEffort: "any",
    requestTags: [],
    tagMatchMode: "any",
    effortMode: "inherit",
    targetEffort: null,
    targetKind: "keep",
    targetModel: null,
    targetComboId: null,
    budgetAction: "preserve",
    budgetTokens: null,
    priority: 0,
    enabled: true,
    ...patch,
  };
}

test.beforeEach(resetStorage);
test.after(async () => {
  await resetStorage();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("gemini-3.5-flash (AI Studio provider) resolves as thinking-capable", () => {
  const resolved = caps.getResolvedModelCapabilities({
    provider: "gemini",
    model: "gemini-3.5-flash",
  });
  assert.equal(resolved.supportsThinking, true);
});

test("reasoning_effort 'high' on gemini-3.5-flash is NOT rejected by routing policy", async () => {
  await rulesDb.createReasoningRoutingRule(ruleInput());
  const decision = await policy.resolveReasoningRoutingRule({
    sourceModel: "gemini/gemini-3.5-flash",
    sourceModelAliases: ["gemini-3.5-flash"],
    sourceEffort: "high",
    hasReasoningSignal: true,
  });
  assert.ok(decision, "a matching rule must produce a decision");
  assert.equal(decision.capability, "supported");
});
