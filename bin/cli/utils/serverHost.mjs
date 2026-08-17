import { hostname, platform } from "node:os";

/**
 * Resolve the bind host passed to the standalone Next.js server.
 *
 * HOSTNAME is a standard shell variable on Unix-like systems, so only the
 * dedicated OmniRoute variable is treated as configuration there. Windows
 * keeps the legacy HOSTNAME fallback for compatibility with existing .env
 * files, while still ignoring the OS-reported machine name.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {NodeJS.Platform} [runtimePlatform]
 * @param {string} [machineHostname]
 * @returns {string}
 */
export function resolveServerHost(
  env = process.env,
  runtimePlatform = platform(),
  machineHostname = hostname()
) {
  if (env.OMNIROUTE_SERVER_HOST) return env.OMNIROUTE_SERVER_HOST;
  if (runtimePlatform === "win32" && env.HOSTNAME && env.HOSTNAME !== machineHostname) {
    return env.HOSTNAME;
  }
  return "0.0.0.0";
}
