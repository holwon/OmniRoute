// Integration test for #10452: a server-emitted application-level pong must not
// keep a half-open client alive. Uses the real server harness from
// tests/integration/live-ws-startup.test.ts (serial, --test-concurrency=1
// integration runner — this test needs a ~50s window to cross the server's
// HEARTBEAT_TIMEOUT_MS, which is intentionally NOT inflated here).
import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import net from "node:net";
import test from "node:test";
import WebSocket from "ws";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("Failed to allocate a local port"));
      });
    });
  });
}

function terminateTree(child: ChildProcessWithoutNullStreams): void {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function waitForStartup(
  child: ChildProcessWithoutNullStreams,
  getOutput: () => string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`LiveWS startup timed out. Output:\n${getOutput()}`));
    }, 30_000);

    const onData = () => {
      const output = getOutput();
      if (output.includes("Dashboard WebSocket server listening")) {
        cleanup();
        resolve();
      }
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(`LiveWS exited before listening: code=${code} signal=${signal}\n${getOutput()}`)
      );
    };

    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.stderr.off("data", onData);
      child.off("exit", onExit);
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", onExit);
    onData();
  });
}

test(
  "LiveWS removes a silent socket but keeps one answering protocol heartbeats (#10452)",
  // A fresh DATA_DIR can spend up to the server-startup allowance running the
  // complete migration set before the 50s heartbeat observation window.
  { timeout: 95_000 },
  async () => {
    const port = await getFreePort();
    const apiKey = "test-live-ws-heartbeat-key";
    const jwtSecret = "test-live-ws-heartbeat-jwt-secret";
    const origin = "http://localhost";
    let output = "";

    const child = spawn(process.execPath, ["scripts/start-ws-server.mjs"], {
      cwd: process.cwd(),
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        NODE_ENV: "test",
        OMNIROUTE_API_KEY: apiKey,
        JWT_SECRET: jwtSecret,
        LIVE_WS_HOST: "127.0.0.1",
        LIVE_WS_PORT: String(port),
        LIVE_WS_ALLOWED_ORIGINS: origin,
      },
    });

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });

    try {
      await waitForStartup(child, () => output);

      const connect = (answerHeartbeat: boolean) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/live-ws`, {
          headers: { Authorization: `Bearer ${apiKey}`, Origin: origin },
        });
        let heartbeat: NodeJS.Timeout | undefined;
        const welcome = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Timed out waiting for welcome. Output:\n${output}`));
          }, 5_000);

          ws.once("open", () => {
            ws.send(JSON.stringify({ type: "subscribe", channels: ["requests"] }));
            if (answerHeartbeat) {
              heartbeat = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "ping" }));
                }
              }, 10_000);
            }
          });

          ws.on("message", (data) => {
            if (JSON.parse(data.toString()).type === "welcome") {
              clearTimeout(timeout);
              resolve();
            }
          });

          ws.once("error", (error) => {
            clearTimeout(timeout);
            reject(new Error(`LiveWS client failed: ${error.message}. Output:\n${output}`));
          });
        });

        return { ws, welcome, stop: () => clearInterval(heartbeat) };
      };

      const silent = connect(false);
      const responsive = connect(true);
      await Promise.all([silent.welcome, responsive.welcome]);

      // Wait past HEARTBEAT_TIMEOUT_MS (35s) plus one heartbeat interval (15s).
      // The server emits application-level pong frames during this period, but
      // only the responsive client sends the inbound { type: "ping" } signal.
      await new Promise((resolve) => setTimeout(resolve, 50_000));

      assert.equal(
        silent.ws.readyState,
        WebSocket.CLOSED,
        `Silent socket remained alive after timeout — server pong renewed lastActivity. Output:\n${output}`
      );
      assert.notEqual(
        responsive.ws.readyState,
        WebSocket.CLOSED,
        `Protocol-heartbeat client was terminated. Output:\n${output}`
      );

      silent.stop();
      responsive.stop();
      silent.ws.close();
      responsive.ws.close();
    } finally {
      terminateTree(child);
    }
  }
);
