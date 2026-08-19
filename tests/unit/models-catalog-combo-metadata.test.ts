import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-combo-metadata-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.API_KEY_SECRET ||= "combo-metadata-test-secret";

const core = await import("../../src/lib/db/core.ts");
const providersDb = await import("../../src/lib/db/providers.ts");
const combosDb = await import("../../src/lib/db/combos.ts");
const contextOverrides = await import("../../src/lib/db/modelContextOverrides.ts");
const catalog = await import("../../src/app/api/v1/models/catalog.ts");

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("single-target combo preserves its direct model metadata", async () => {
  await providersDb.createProviderConnection({
    provider: "codex",
    authType: "oauth",
    name: "codex-gpt-5.6-single-target-combo",
    accessToken: "codex-test-token",
    isActive: true,
    testStatus: "active",
    providerSpecificData: {},
  });
  await combosDb.createCombo({
    name: "gpt-5.6-sol-combo",
    strategy: "auto",
    models: ["codex/gpt-5.6-sol"],
  });

  const response = await catalog.getUnifiedModelsResponse(
    new Request("http://localhost/api/v1/models")
  );
  const body = (await response.json()) as { data: Array<Record<string, unknown>> };
  const direct = body.data.find((item) => item.id === "cx/gpt-5.6-sol");
  const combo = body.data.find((item) => item.id === "gpt-5.6-sol-combo");

  assert.equal(response.status, 200);
  assert.ok(direct);
  assert.ok(combo);
  for (const field of [
    "context_length",
    "max_input_tokens",
    "max_output_tokens",
    "input_modalities",
    "output_modalities",
    "capabilities",
  ]) {
    assert.deepEqual(combo[field], direct[field], field);
  }
});

test("single-target Codex combo advertises a larger model context override", async () => {
  const modelId = "gpt-5.6-terra";
  const contextWindow = 500000;
  assert.equal(contextOverrides.setModelContextOverride("codex", modelId, contextWindow), true);

  try {
    await providersDb.createProviderConnection({
      provider: "codex",
      authType: "oauth",
      name: "codex-gpt-5.6-context-override-combo",
      accessToken: "codex-test-token",
      isActive: true,
      testStatus: "active",
      providerSpecificData: {},
    });
    await combosDb.createCombo({
      name: "gpt-5.6-context-override-combo",
      strategy: "auto",
      models: [`codex/${modelId}`],
    });

    const response = await catalog.getUnifiedModelsResponse(
      new Request("http://localhost/api/v1/models")
    );
    const body = (await response.json()) as { data: Array<Record<string, unknown>> };
    const direct = body.data.find((item) => item.id === `cx/${modelId}`);
    const combo = body.data.find((item) => item.id === "gpt-5.6-context-override-combo");

    assert.equal(response.status, 200);
    assert.equal(direct?.context_length, contextWindow);
    assert.equal(combo?.context_length, contextWindow);
    assert.equal(combo?.max_input_tokens, 272000);
  } finally {
    contextOverrides.removeModelContextOverride("codex", modelId);
  }
});

test("single-target combo respects registry reasoning overrides before specs", async () => {
  await providersDb.createProviderConnection({
    provider: "command-code",
    authType: "apikey",
    name: "command-code-gpt-5.4-mini-combo",
    apiKey: "command-code-test-key",
    isActive: true,
    testStatus: "active",
    providerSpecificData: {},
  });
  await combosDb.createCombo({
    name: "gpt-5.4-mini-command-code-combo",
    strategy: "auto",
    models: ["command-code/gpt-5.4-mini"],
  });

  const response = await catalog.getUnifiedModelsResponse(
    new Request("http://localhost/api/v1/models")
  );
  const body = (await response.json()) as { data: Array<Record<string, unknown>> };
  const combo = body.data.find((item) => item.id === "gpt-5.4-mini-command-code-combo");

  assert.equal(response.status, 200);
  assert.ok(combo);
  const capabilities = combo.capabilities as Record<string, unknown>;
  assert.equal(capabilities.reasoning, false);
  assert.equal(capabilities.thinking, false);
  assert.equal(capabilities.supportsThinking, false);
  assert.equal(Object.hasOwn(capabilities, "effort_tiers"), false);
});

test("single-target combo reflects unblocked Antigravity Gemini reasoning", async () => {
  await providersDb.createProviderConnection({
    provider: "antigravity",
    authType: "oauth",
    name: "antigravity-gemini-reasoning-combo",
    accessToken: "antigravity-test-token",
    isActive: true,
    testStatus: "active",
    providerSpecificData: {},
  });
  await combosDb.createCombo({
    name: "antigravity-gemini-reasoning-combo",
    strategy: "auto",
    models: ["antigravity/gemini-3.1-pro-high"],
  });

  const response = await catalog.getUnifiedModelsResponse(
    new Request("http://localhost/api/v1/models")
  );
  const body = (await response.json()) as { data: Array<Record<string, unknown>> };
  const combo = body.data.find((item) => item.id === "antigravity-gemini-reasoning-combo");

  assert.equal(response.status, 200);
  assert.ok(combo);
  const capabilities = combo.capabilities as Record<string, unknown>;
  assert.equal(capabilities.reasoning, true);
  assert.equal(capabilities.thinking, true);
  assert.equal(capabilities.supportsThinking, true);
  assert.equal(Object.hasOwn(capabilities, "effort_tiers"), true);
});

test("mixed DeepSeek combos advertise the efforts accepted by every V4 target", async () => {
  await providersDb.createProviderConnection({
    provider: "deepseek",
    authType: "apikey",
    name: "deepseek-v4-combos",
    apiKey: "deepseek-test-key",
    isActive: true,
    testStatus: "active",
  });
  await providersDb.createProviderConnection({
    provider: "opencode-go",
    authType: "apikey",
    name: "opencode-go-deepseek-v4-combos",
    apiKey: "opencode-go-test-key",
    isActive: true,
    testStatus: "active",
  });
  for (const modelId of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
    await combosDb.createCombo({
      name: `${modelId}-combo`,
      strategy: "auto",
      models: [`deepseek/${modelId}`, `opencode-go/${modelId}`],
    });
  }

  const response = await catalog.getUnifiedModelsResponse(
    new Request("http://localhost/api/v1/models")
  );
  const body = (await response.json()) as { data: Array<Record<string, unknown>> };

  assert.equal(response.status, 200);
  for (const modelId of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
    const combo = body.data.find((item) => item.id === `${modelId}-combo`);
    assert.ok(combo);
    assert.deepEqual((combo.capabilities as Record<string, unknown>).effort_tiers, [
      "none",
      "low",
      "high",
      "max",
    ]);
  }
});
