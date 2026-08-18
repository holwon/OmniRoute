import {
  runLaunchCommand as runLaunchClaudeCommand,
  buildClaudeEnv,
  resolveClaudeSpawn,
  quoteClaudeArgs,
  resolveLaunchTarget,
} from "./launch.mjs";
import {
  buildCodexEnv,
  buildCodexProviderArgs,
  resolveCodexSpawn,
  quoteCodexArgs,
  resolveCodexTarget,
  runLaunchCodexCommand as runLaunchCodexCommand,
} from "./launch-codex.mjs";
import { t } from "../i18n.mjs";
import os from "node:os";
import { join } from "node:path";
import { resolveActiveContext } from "../contexts.mjs";

const RUN_TARGETS = {
  claude: {
    aliases: ["claude", "claude-code", "cc"],
    description: "Claude Code",
  },
  codex: {
    aliases: ["codex", "openai-codex", "openai"],
    description: "OpenAI Codex CLI",
  },
};

/** @type {Record<string,string>} */
const RUN_TARGET_ALIAS_TO_CANONICAL = {
  claude: "claude",
  "claude-code": "claude",
  cc: "claude",
  codex: "codex",
  "openai-codex": "codex",
  openai: "codex",
};

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function toAuthSource(targetOpts) {
  const explicit =
    !isBlank(targetOpts.token) || !isBlank(targetOpts.apiKey) || !isBlank(targetOpts["api-key"]);
  if (explicit) return "option";

  try {
    const context = resolveActiveContext(targetOpts.context || process.env.OMNIROUTE_CONTEXT);
    if (context && (context.accessToken || context.apiKey)) return "context";
  } catch {
    // no active context
  }

  if (!isBlank(process.env.OMNIROUTE_API_KEY)) return "env";
  if (!isBlank(process.env.ANTHROPIC_AUTH_TOKEN)) return "env";
  return "none";
}

/** Resolve supported target to canonical id. */
export function resolveRunTarget(target) {
  const raw = String(target || "")
    .trim()
    .toLowerCase();
  return RUN_TARGET_ALIAS_TO_CANONICAL[raw];
}

export function listRunTargets() {
  return Object.keys(RUN_TARGETS);
}

/**
 * Normalize `--provider` + `--model` into one model id.
 *
 * - when model contains a slash, keep it as-is
 * - when provider exists and model does not, prefix provider/
 */
export function resolveModelFromTargetOptions(targetOpts = {}) {
  const provider = String(targetOpts.provider || "").trim();
  const model = String(targetOpts.model || "").trim();
  if (!model) return "";
  if (provider && !model.includes("/")) return `${provider}/${model}`;
  return model;
}

function describeCommand(command, shellMode) {
  return `${command}${shellMode ? " [shell]" : ""}`;
}

function envPreview(before = {}, after = {}) {
  const beforeKeys = new Set(Object.keys(before));
  const changedOrAdded = [];
  const removed = [];

  for (const key of Object.keys(after)) {
    if (!beforeKeys.has(key) || String(before[key]) !== String(after[key])) {
      changedOrAdded.push(key);
    }
  }

  for (const key of Object.keys(before)) {
    if (!(key in after)) removed.push(key);
  }

  return {
    changedOrAdded,
    removed,
  };
}

async function buildClaudePlan(rawOpts, args = []) {
  const model = resolveModelFromTargetOptions(rawOpts);
  const merged = {
    ...rawOpts,
    model,
    apiKey: rawOpts.apiKey || rawOpts["api-key"] || rawOpts.token,
    token: rawOpts.token || rawOpts.apiKey || rawOpts["api-key"],
    profile: rawOpts.profile ?? rawOpts.p,
  };

  const { baseUrl, authToken } = resolveLaunchTarget(merged);
  const commandSpec = await resolveClaudeSpawn(process.platform);

  const configDir = merged.profile
    ? join(merged.claudeHome || join(os.homedir(), ".claude"), "profiles", merged.profile)
    : undefined;

  const env = buildClaudeEnv(process.env, baseUrl, authToken, {
    configDir,
    model: merged.model || undefined,
  });
  const quotedArgs = quoteClaudeArgs(args, process.platform);

  return {
    target: "claude",
    baseUrl,
    command: commandSpec.command,
    shell: commandSpec.shell,
    args: quotedArgs,
    model: merged.model || undefined,
    envDiff: envPreview(process.env, env),
    authSource: toAuthSource(merged),
    commandDisplay: describeCommand(commandSpec.command, commandSpec.shell),
  };
}

async function buildCodexPlan(rawOpts, args = []) {
  const model = resolveModelFromTargetOptions(rawOpts);
  const merged = {
    ...rawOpts,
    apiKey: rawOpts.apiKey || rawOpts["api-key"] || rawOpts.token,
    model,
    profile: rawOpts.profile ?? rawOpts.p,
  };

  const { baseUrl, authToken } = resolveCodexTarget(merged);
  const commandSpec = await resolveCodexSpawn(process.platform);

  const providerArgs = buildCodexProviderArgs(baseUrl, merged.model || undefined);
  const profileArgs = merged.profile ? ["--profile", merged.profile] : [];

  const env = buildCodexEnv(process.env, authToken);
  const fullArgs = [...providerArgs, ...profileArgs, ...args];
  const quotedArgs = quoteCodexArgs(fullArgs, process.platform);

  return {
    target: "codex",
    baseUrl,
    command: commandSpec.command,
    shell: commandSpec.shell,
    args: quotedArgs,
    model: merged.model || undefined,
    envDiff: envPreview(process.env, env),
    authSource: toAuthSource(merged),
    commandDisplay: describeCommand(commandSpec.command, commandSpec.shell),
    providerArgs,
    profileArgs,
  };
}

/** Build a launch plan and redact any resolved secret values. */
export async function buildRunPlan(target, rawOpts = {}, args = []) {
  const canonical = resolveRunTarget(target);
  if (!canonical) {
    throw new Error("unsupported target");
  }

  if (canonical === "claude") {
    return buildClaudePlan(rawOpts, args);
  }

  return buildCodexPlan(rawOpts, args);
}

function writeDryRunOutput(plan, opts = {}) {
  const output = {
    target: plan.target,
    baseUrl: plan.baseUrl,
    command: plan.command,
    args: plan.args,
    auth: {
      source: plan.authSource,
      present: plan.authSource !== "none",
    },
    shell: !!plan.shell,
    model: plan.model || null,
    env: {
      changedOrAdded: plan.envDiff.changedOrAdded,
      removed: plan.envDiff.removed,
    },
  };

  if (opts.json) {
    console.error(`Running in dry-run mode for '${plan.target}'.`);
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`target: ${output.target}`);
    console.log(`baseUrl: ${output.baseUrl}`);
    console.log(`command: ${output.command}`);
    console.log(`shell: ${output.shell ? "yes" : "no"}`);
    console.log(`args: ${JSON.stringify(output.args)}`);
    console.log(`auth: ${JSON.stringify(output.auth)}`);
    console.log(`model: ${output.model || "(not set)"}`);
    if (output.env.changedOrAdded.length) {
      console.log(`env added/changed: ${output.env.changedOrAdded.join(", ")}`);
    }
    if (output.env.removed.length) {
      console.log(`env removed: ${output.env.removed.join(", ")}`);
    }
  }
}

function buildExecutionOptionsForClaude(rawOpts) {
  return {
    ...rawOpts,
    model: resolveModelFromTargetOptions(rawOpts),
    token: rawOpts.token || rawOpts.apiKey || rawOpts["api-key"],
    apiKey: rawOpts.apiKey || rawOpts["api-key"] || rawOpts.token,
    profile: rawOpts.profile || rawOpts.p,
  };
}

function buildExecutionOptionsForCodex(rawOpts) {
  return {
    ...rawOpts,
    model: resolveModelFromTargetOptions(rawOpts),
    apiKey: rawOpts.apiKey || rawOpts["api-key"] || rawOpts.token,
    profile: rawOpts.profile || rawOpts.p,
  };
}

/**
 * Execute or preview one target launch.
 *
 * Return code conventions:
 * 0 success, 1 runtime launch failure, 2 invalid args.
 */
export async function runCliTarget(target, opts = {}, args = []) {
  const canonical = resolveRunTarget(target);
  if (!canonical) {
    process.stderr.write(
      `Unsupported target '${target}'. Supported targets: ${Object.keys(RUN_TARGETS).join(", ")}\n`
    );
    return 2;
  }

  const plan = await buildRunPlan(target, opts, args);

  if (opts.dryRun) {
    writeDryRunOutput(plan, opts);
    return 0;
  }

  if (canonical === "claude") {
    return await runLaunchClaudeCommand(buildExecutionOptionsForClaude(opts), args);
  }

  return await runLaunchCodexCommand(buildExecutionOptionsForCodex(opts), args);
}

export function registerRun(program) {
  program
    .command("run <target>")
    .description(t("run.description") || "Run a supported CLI target through OmniRoute")
    .option(
      "--port <port>",
      "Local OmniRoute port (ignored when --remote or --base-url is set)",
      "20128"
    )
    .option(
      "--remote <url>",
      "Remote OmniRoute base URL (overrides --port, --base-url, and the active context)"
    )
    .option("--provider <id>", "Provider id for shorthand model composition")
    .option("--model <id>", "Model id to inject in the launched target where supported")
    .option("--profile <name>", "Profile/alias argument for target launchers that support it")
    .option("-p, --p <name>", "Alias for --profile")
    .option("--token <token>", "Authentication token for the launched target (same as --api-key)")
    .option("--api-key <key>", "Authentication token for the launched target")
    .option("--dry-run", "Show planned command and env keys without executing")
    .option("--json", "Return dry-run output in machine-readable format")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .argument("[toolArgs...]")
    .action(async (target, toolArgs = [], opts, cmd) => {
      const globalOpts = cmd?.optsWithGlobals ? cmd.optsWithGlobals() : {};
      const merged = { ...globalOpts, ...opts };
      const code = await runCliTarget(target, merged, toolArgs);
      // process.exit() here can interrupt cleanup when the child terminates;
      // setting process.exitCode lets the event loop drain first.
      process.exitCode = code;
    });
}
