import assert from "node:assert/strict";
import test from "node:test";

import {
  VideoDrilldownCache,
  type VideoDrilldownFrame,
} from "../../../src/lib/guardrails/videoBridgeDrilldown";

const frames: VideoDrilldownFrame[] = [
  { dataUri: "data:image/jpeg;base64,QQ==", timestampSeconds: 1 },
  { dataUri: "data:image/jpeg;base64,Qg==", timestampSeconds: 5 },
  { dataUri: "data:image/jpeg;base64,Qw==", timestampSeconds: 9 },
];

test("drill-down cache isolates sessions and returns bounded focus slices", () => {
  const cache = new VideoDrilldownCache({ now: () => 1000, ttlMs: 5000, maxEntries: 4 });
  cache.put("session-a", "video-a", { durationSeconds: 10, frames });
  cache.put("session-b", "video-a", { durationSeconds: 10, frames: [frames[0]] });

  assert.deepEqual(
    cache.get("session-a", "video-a", { endSeconds: 6, frameCount: 2 })?.frames,
    frames.slice(0, 2)
  );
  assert.equal(cache.get("session-a", "video-b"), null);
  assert.equal(cache.get("session-b", "video-a")?.frames.length, 1);
});

test("drill-down cache clamps a valid focus and preserves timeline metadata", () => {
  const cache = new VideoDrilldownCache({ now: () => 1000, ttlMs: 5000, maxEntries: 4 });
  cache.put("session", "video", { durationSeconds: 10, frames });
  const result = cache.get("session", "video", {
    endSeconds: 100,
    startSeconds: -4,
    frameCount: 16,
  });
  assert.deepEqual(result?.focusWindow, { endSeconds: 10, startSeconds: 0 });
  assert.equal(result?.durationSeconds, 10);
  assert.equal(result?.frames.length, 3);
});

test("drill-down cache rejects invalid and oversized frame payloads", () => {
  const cache = new VideoDrilldownCache({ now: () => 1000, ttlMs: 5000, maxEntries: 4 });
  assert.throws(() => cache.put("session", "video", { durationSeconds: 10, frames: [] }), /frame/i);
  assert.throws(
    () =>
      cache.put("session", "video", {
        durationSeconds: 10,
        frames: [{ dataUri: "data:image/png;base64,QQ==", timestampSeconds: 1 }],
      }),
    /JPEG/i
  );
});

test("drill-down cache expires entries and evicts the least recently used key", () => {
  let now = 1000;
  const cache = new VideoDrilldownCache({ now: () => now, ttlMs: 5000, maxEntries: 1 });
  cache.put("session-a", "video", { durationSeconds: 10, frames });
  cache.put("session-b", "video", { durationSeconds: 10, frames });
  assert.equal(cache.get("session-a", "video"), null);
  now = 7000;
  assert.equal(cache.get("session-b", "video"), null);
});

test("drill-down cache enforces a global byte budget with LRU eviction", () => {
  const bigFrame = (fill: string): VideoDrilldownFrame => ({
    dataUri: `data:image/jpeg;base64,${fill.repeat(4000)}`,
    timestampSeconds: 1,
  });
  // Each entry is ~3000 decoded bytes; the budget fits two entries.
  const cache = new VideoDrilldownCache({
    now: () => 1000,
    ttlMs: 5000,
    maxEntries: 10,
    maxTotalBytes: 7000,
  });
  cache.put("s", "v1", { durationSeconds: 10, frames: [bigFrame("A")] });
  cache.put("s", "v2", { durationSeconds: 10, frames: [bigFrame("B")] });
  assert.ok(cache.get("s", "v1"));
  assert.ok(cache.get("s", "v2"));
  cache.put("s", "v3", { durationSeconds: 10, frames: [bigFrame("C")] });
  assert.equal(cache.get("s", "v1"), null, "the least recently used entry must be evicted");
  assert.ok(cache.get("s", "v2"));
  assert.ok(cache.get("s", "v3"));
  assert.ok(cache.get("s", "v2"));
  cache.put("s", "v4", { durationSeconds: 10, frames: [bigFrame("D")] });
  assert.equal(cache.get("s", "v3"), null, "eviction must follow recency, not insertion order");
  assert.ok(cache.get("s", "v2"));
  assert.ok(cache.get("s", "v4"));
});

test("drill-down cache rejects an entry larger than the whole byte budget", () => {
  const cache = new VideoDrilldownCache({
    now: () => 1000,
    ttlMs: 5000,
    maxEntries: 4,
    maxTotalBytes: 1000,
  });
  assert.throws(
    () =>
      cache.put("s", "v1", {
        durationSeconds: 10,
        frames: [{ dataUri: `data:image/jpeg;base64,${"A".repeat(4000)}`, timestampSeconds: 1 }],
      }),
    /byte budget/i
  );
  assert.equal(cache.get("s", "v1"), null);
  assert.throws(
    () => new VideoDrilldownCache({ now: () => 0, ttlMs: 1, maxEntries: 1, maxTotalBytes: 0 }),
    /byte budget/i
  );
});
