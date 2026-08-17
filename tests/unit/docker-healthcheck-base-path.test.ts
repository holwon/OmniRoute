import test from "node:test";
import assert from "node:assert/strict";
import { resolveHealthPath } from "../../scripts/dev/healthcheck.mjs";

test("resolveHealthPath keeps the default route at the domain root", () => {
  assert.equal(resolveHealthPath(""), "/healthz");
  assert.equal(resolveHealthPath(undefined), "/healthz");
});

test("resolveHealthPath prefixes the health route with OMNIROUTE_BASE_PATH", () => {
  assert.equal(resolveHealthPath("/omniroute/"), "/omniroute/healthz");
  assert.equal(resolveHealthPath("/omniroute"), "/omniroute/healthz");
});
