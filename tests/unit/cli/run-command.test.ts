import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildRunPlan,
  resolveRunTarget,
  resolveModelFromTargetOptions,
  runCliTarget,
} from "../../../bin/cli/commands/run.mjs";

test("resolveRunTarget resolves aliases", () => {
  assert.equal(resolveRunTarget("claude"), "claude");
  assert.equal(resolveRunTarget("CLAUDE-CODE"), "claude");
  assert.equal(resolveRunTarget("cc"), "claude");
  assert.equal(resolveRunTarget("codex"), "codex");
  assert.equal(resolveRunTarget("openai-codex"), "codex");
  assert.equal(resolveRunTarget("openai"), "codex");
  assert.equal(resolveRunTarget("unknown"), undefined);
});

test("resolveModelFromTargetOptions prefixes provider", () => {
  assert.equal(resolveModelFromTargetOptions({ provider: "glm", model: "glm-4.5" }), "glm/glm-4.5");
  assert.equal(
    resolveModelFromTargetOptions({ provider: "glm", model: "glm/glm-4.5" }),
    "glm/glm-4.5"
  );
  assert.equal(resolveModelFromTargetOptions({ model: "glm/glm-4.5" }), "glm/glm-4.5");
  assert.equal(resolveModelFromTargetOptions({ provider: "glm" }), "");
});

test("buildRunPlan for claude includes env diff and model injection", async () => {
  const plan = await buildRunPlan(
    "claude",
    { port: "20128", apiKey: "sk_test_x", model: "gpt-5" },
    ["--help"]
  );
  assert.equal(plan.target, "claude");
  assert.equal(plan.baseUrl, "http://localhost:20128");
  assert.equal(plan.model, "gpt-5");
  assert.equal(plan.args.includes("--help"), true);
  assert.equal(plan.envDiff.changedOrAdded.includes("ANTHROPIC_AUTH_TOKEN"), true);
  assert.equal(plan.authSource, "option");
  assert.equal(plan.command.includes("claude"), true);
});

test("buildRunPlan for codex injects model into provider args", async () => {
  const plan = await buildRunPlan(
    "codex",
    { baseUrl: "http://localhost:20128", apiKey: "sk_test_x", model: "glm/glm-4.5" },
    ["--help"]
  );
  assert.equal(plan.target, "codex");
  assert.equal(plan.baseUrl, "http://localhost:20128");
  assert.equal(plan.model, "glm/glm-4.5");
  assert.equal(plan.args.includes("--help"), true);
  assert.equal(
    plan.args.some((a) => String(a).includes("model_providers.omniroute.model")),
    true
  );
  assert.equal(plan.authSource, "option");
});

test("runCliTarget returns usage error code for unsupported targets", async () => {
  const seen = [];
  const originalWrite = process.stderr.write;
  // @ts-ignore
  process.stderr.write = (chunk) => {
    seen.push(String(chunk));
    return true;
  };

  const code = await runCliTarget("nope", {}, ["--help"]);

  // @ts-ignore
  process.stderr.write = originalWrite;
  assert.equal(code, 2);
  assert.equal(seen.length > 0, true);
  assert.match(seen.join(""), /Unsupported target/);
});

test("dry-run --json does not print resolved auth token", async () => {
  const chunks = [];
  const originalStdout = process.stdout.write;
  // @ts-ignore
  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));
    return true;
  };

  const code = await runCliTarget(
    "claude",
    { dryRun: true, json: true, apiKey: "sk_live_very_private_token", model: "gpt-5" },
    []
  );

  // @ts-ignore
  process.stdout.write = originalStdout;
  assert.equal(code, 0);
  const raw = chunks.join("");
  assert.equal(raw.includes("sk_live_very_private_token"), false);
});
