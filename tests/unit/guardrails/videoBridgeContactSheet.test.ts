import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import { describeVideoPart } from "../../../src/lib/guardrails/videoBridgeHelpers";
import { buildVideoContactSheet } from "../../../src/lib/guardrails/videoBridgeContactSheet";

async function frame(color: string, timestampSeconds: number) {
  const bytes = await sharp({
    create: { background: color, channels: 3, height: 24, width: 32 },
  })
    .jpeg()
    .toBuffer();
  return { dataUri: `data:image/jpeg;base64,${bytes.toString("base64")}`, timestampSeconds };
}

test("builds a bounded contact sheet and preserves timestamp labels", async () => {
  const result = await buildVideoContactSheet([
    await frame("red", 1),
    await frame("green", 5),
    await frame("blue", 9),
  ]);

  assert.equal(result.used, true);
  assert.match(result.dataUri ?? "", /^data:image\/jpeg;base64,/);
  assert.deepEqual(result.timestamps, [1, 5, 9]);
  assert.equal(result.frames.length, 3);
});

test("contact sheet falls back to individual frames when decoding fails", async () => {
  const frames = [{ dataUri: "data:image/jpeg;base64,QQ==", timestampSeconds: 2 }];
  const result = await buildVideoContactSheet(frames);
  assert.equal(result.used, false);
  assert.equal(result.fallbackReason, "CONTACT_SHEET_UNAVAILABLE");
  assert.deepEqual(result.frames, frames);
});

test("contact sheet respects the parent abort signal", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    buildVideoContactSheet([await frame("red", 1)], { signal: controller.signal }),
    /aborted/i
  );
});

test("Video Bridge uses the sheet only when explicitly requested", async () => {
  const sourceFrames = [await frame("red", 1), await frame("blue", 5)];
  let captionCalls = 0;
  const result = await describeVideoPart(
    {
      container: "messages",
      contactSheet: true,
      messageIndex: 0,
      partIndex: 0,
      ref: "data:video/mp4;base64,AA==",
      shape: "data_uri_string",
    },
    { frameCount: 2, timeoutMs: 5000 },
    async () => {
      captionCalls += 1;
      return "combined scene";
    },
    {
      extractFrames: async () => ({ durationSeconds: 6, frames: sourceFrames }),
    }
  );

  assert.equal(captionCalls, 1);
  assert.equal(result.contactSheetUsed, true);
  assert.match(result.description, /contact-sheet\[timestamps=00:01\.000,00:05\.000\]/);
});
