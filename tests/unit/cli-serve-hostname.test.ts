import test from "node:test";
import assert from "node:assert/strict";
import { resolveServerHost } from "../../bin/cli/utils/serverHost.mjs";

test("serve hostname: Linux honors OMNIROUTE_SERVER_HOST when HOSTNAME is set", () => {
  assert.equal(
    resolveServerHost(
      { OMNIROUTE_SERVER_HOST: "127.0.0.1", HOSTNAME: "fedora" },
      "linux",
      "localhost-live"
    ),
    "127.0.0.1"
  );
});

test("serve hostname: OMNIROUTE_SERVER_HOST overrides the Windows legacy HOSTNAME", () => {
  assert.equal(
    resolveServerHost(
      { OMNIROUTE_SERVER_HOST: "127.0.0.1", HOSTNAME: "192.168.1.50" },
      "win32",
      "windows-pc"
    ),
    "127.0.0.1"
  );
});

test("serve hostname: Linux ignores HOSTNAME when it differs from os.hostname() (#10492)", () => {
  // Fedora can export a short HOSTNAME while os.hostname() reports a different
  // canonical name. The standard shell variable must never become the bind host.
  assert.equal(resolveServerHost({ HOSTNAME: "fedora" }, "linux", "localhost-live"), "0.0.0.0");
});

test("serve hostname: macOS ignores HOSTNAME even when it matches os.hostname() (#6194)", () => {
  assert.equal(resolveServerHost({ HOSTNAME: "myhostname" }, "darwin", "myhostname"), "0.0.0.0");
});

test("serve hostname: falls back to 0.0.0.0 when no bind variable is set", () => {
  assert.equal(resolveServerHost({}, "linux", "myhostname"), "0.0.0.0");
});

test("serve hostname: falls back to 0.0.0.0 when bind variables are empty", () => {
  assert.equal(
    resolveServerHost({ OMNIROUTE_SERVER_HOST: "", HOSTNAME: "" }, "linux", "myhostname"),
    "0.0.0.0"
  );
});

test("serve hostname: Windows preserves an explicit legacy HOSTNAME", () => {
  assert.equal(
    resolveServerHost({ HOSTNAME: "192.168.1.50" }, "win32", "windows-pc"),
    "192.168.1.50"
  );
});

test("serve hostname: Windows ignores an auto-set HOSTNAME matching the machine", () => {
  assert.equal(resolveServerHost({ HOSTNAME: "windows-pc" }, "win32", "windows-pc"), "0.0.0.0");
});
