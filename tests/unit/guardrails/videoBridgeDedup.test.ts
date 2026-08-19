import assert from "node:assert/strict";
import test from "node:test";

import {
  deduplicateVideoFrames,
  type VideoCaptionFrame,
} from "../../../src/lib/guardrails/videoBridgeHelpers.ts";

const frame = (
  timestampSeconds: number,
  dataUri = "data:image/jpeg;base64,QQ=="
): VideoCaptionFrame => ({
  dataUri,
  timestampSeconds,
});

test("deduplication keeps the first frame and the final frame while dropping redundant middle frames", async () => {
  const result = await deduplicateVideoFrames([frame(1), frame(2), frame(3), frame(4)], {
    compare: async () => 0.01,
    threshold: 0.05,
  });

  assert.deepEqual(
    result.frames.map((item) => item.timestampSeconds),
    [1, 4]
  );
  assert.equal(result.dropped, 2);
});

test("deduplication keeps visually distinct frames", async () => {
  const result = await deduplicateVideoFrames([frame(1), frame(2), frame(3)], {
    compare: async () => 0.2,
    threshold: 0.05,
  });

  assert.equal(result.frames.length, 3);
  assert.equal(result.dropped, 0);
});

test("deduplication fails open when the visual comparator errors", async () => {
  const result = await deduplicateVideoFrames([frame(1), frame(2)], {
    compare: async () => {
      throw new Error("invalid JPEG");
    },
  });

  assert.equal(result.frames.length, 2);
  assert.equal(result.dropped, 0);
});
