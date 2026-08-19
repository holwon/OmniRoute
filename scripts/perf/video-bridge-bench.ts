/**
 * Video Bridge benchmarks (VB-FU-07 sampler overhead + VB-FU-09 contact sheet A/B).
 *
 * Run: node --import tsx/esm scripts/perf/video-bridge-bench.ts
 *
 * 1. Sampler: measures the pure timestamp-selection cost of uniform vs
 *    scene_aware vs segment_aware for growing scene-candidate counts. The
 *    ffmpeg scene-detection pass is shared by both aware policies and is
 *    I/O-bound, so the incremental policy cost is exactly this selection step.
 * 2. Contact sheet: composes synthetic JPEG frames into the timestamped grid
 *    and compares payload bytes + model calls against individual frames.
 */
import { performance } from "node:perf_hooks";

import { buildVideoContactSheet } from "../../src/lib/guardrails/videoBridgeContactSheet";
import {
  calculateSamplingDecision,
  type VideoSamplingPolicy,
} from "../../src/lib/guardrails/videoBridgeRuntime";

const SAMPLER_ITERATIONS = 2_000;

function benchSampler(): void {
  console.log("== Sampler timestamp-selection cost (pure, per call) ==");
  console.log("duration frames candidates | uniform scene_aware segment_aware (µs/op)");
  for (const durationSeconds of [60, 600]) {
    for (const frameCount of [8, 16]) {
      for (const candidateCount of [0, 16, 128, 512]) {
        const candidates = Array.from(
          { length: candidateCount },
          (_unused, index) => ((index + 1) * durationSeconds) / (candidateCount + 1)
        );
        const row: string[] = [];
        for (const policy of ["uniform", "scene_aware", "segment_aware"] as VideoSamplingPolicy[]) {
          const start = performance.now();
          for (let iteration = 0; iteration < SAMPLER_ITERATIONS; iteration++) {
            calculateSamplingDecision(durationSeconds, frameCount, policy, candidates, null);
          }
          const microsPerOp = ((performance.now() - start) * 1000) / SAMPLER_ITERATIONS;
          row.push(microsPerOp.toFixed(1));
        }
        console.log(
          `${String(durationSeconds).padStart(5)}s ${String(frameCount).padStart(5)} ${String(candidateCount).padStart(10)} | ${row.join("  ")}`
        );
      }
    }
  }
}

async function syntheticJpegFrame(index: number): Promise<string> {
  const { default: sharp } = await import("sharp");
  const buffer = await sharp({
    create: {
      width: 512,
      height: 288,
      channels: 3,
      background: { r: (index * 37) % 255, g: (index * 91) % 255, b: (index * 53) % 255 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function benchContactSheet(): Promise<void> {
  console.log("\n== Contact sheet vs individual frames (synthetic 512x288 JPEG) ==");
  console.log("frames | sheet_ms sheet_KiB individual_KiB model_calls(sheet/individual)");
  for (const frameCount of [1, 4, 8, 16]) {
    const frames = await Promise.all(
      Array.from({ length: frameCount }, async (_unused, index) => ({
        dataUri: await syntheticJpegFrame(index),
        timestampSeconds: index * 2,
      }))
    );
    const individualBytes = frames.reduce((sum, frame) => sum + frame.dataUri.length, 0);
    const start = performance.now();
    const sheet = await buildVideoContactSheet(frames, { timeoutMs: 30_000 });
    const elapsedMs = performance.now() - start;
    const sheetBytes = sheet.used && sheet.dataUri ? sheet.dataUri.length : individualBytes;
    console.log(
      `${String(frameCount).padStart(6)} | ${elapsedMs.toFixed(1).padStart(8)} ${(sheetBytes / 1024).toFixed(1).padStart(9)} ${(individualBytes / 1024).toFixed(1).padStart(14)} ${sheet.used ? 1 : frameCount}/${frameCount}`
    );
    if (!sheet.used) {
      console.log(`        fallbackReason=${sheet.fallbackReason ?? "unknown"}`);
    }
  }
}

benchSampler();
await benchContactSheet();
