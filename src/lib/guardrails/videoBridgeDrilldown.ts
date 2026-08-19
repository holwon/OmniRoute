import { createHash } from "node:crypto";

import { resolveVideoFocusWindow, type VideoFocusWindow } from "./videoBridgeRuntime";

export interface VideoDrilldownFrame {
  dataUri: string;
  timestampSeconds: number;
}

export interface VideoDrilldownPutValue {
  durationSeconds: number;
  frames: readonly VideoDrilldownFrame[];
}

export interface VideoDrilldownResult {
  durationSeconds: number;
  focusWindow?: VideoFocusWindow;
  frames: VideoDrilldownFrame[];
}

export interface VideoDrilldownCacheOptions {
  maxEntries: number;
  /** Aggregate decoded-byte budget across every entry; oldest entries are evicted (LRU) to fit. */
  maxTotalBytes?: number;
  now?: () => number;
  ttlMs: number;
}

interface StoredDrilldown extends VideoDrilldownPutValue {
  bytes: number;
  expiresAt: number;
  sessionId: string;
}

const MAX_FRAME_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_DURATION_SECONDS = 600;

function cacheKey(sessionId: string, videoRef: string): string {
  return createHash("sha256").update(`${sessionId}\0${videoRef}`).digest("hex");
}

function validateFrames(value: VideoDrilldownPutValue): {
  frames: VideoDrilldownFrame[];
  totalBytes: number;
} {
  if (
    !Number.isFinite(value.durationSeconds) ||
    value.durationSeconds <= 0 ||
    value.durationSeconds > MAX_DURATION_SECONDS ||
    !Array.isArray(value.frames) ||
    value.frames.length < 1 ||
    value.frames.length > 16
  ) {
    throw new Error("Invalid drill-down duration or frame count");
  }
  let totalBytes = 0;
  const frames = value.frames.map((frame) => {
    if (
      !frame ||
      !Number.isFinite(frame.timestampSeconds) ||
      frame.timestampSeconds < 0 ||
      frame.timestampSeconds > value.durationSeconds ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/i.test(frame.dataUri)
    ) {
      throw new Error("Invalid drill-down JPEG frame");
    }
    const encoded = frame.dataUri.slice(frame.dataUri.indexOf(",") + 1);
    const bytes = Math.floor((encoded.length * 3) / 4);
    if (bytes < 1 || bytes > MAX_FRAME_BYTES)
      throw new Error("Drill-down frame byte limit exceeded");
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("Drill-down response byte limit exceeded");
    return { dataUri: frame.dataUri, timestampSeconds: frame.timestampSeconds };
  });
  return {
    frames: frames.sort((left, right) => left.timestampSeconds - right.timestampSeconds),
    totalBytes,
  };
}

export class VideoDrilldownCache {
  private readonly entries = new Map<string, StoredDrilldown>();
  private readonly now: () => number;
  private totalBytes = 0;

  constructor(private readonly options: VideoDrilldownCacheOptions) {
    if (!Number.isFinite(options.ttlMs) || options.ttlMs <= 0) {
      throw new Error("Drill-down cache TTL must be positive");
    }
    if (!Number.isInteger(options.maxEntries) || options.maxEntries < 1) {
      throw new Error("Drill-down cache entry limit is invalid");
    }
    if (
      options.maxTotalBytes !== undefined &&
      (!Number.isInteger(options.maxTotalBytes) || options.maxTotalBytes < 1)
    ) {
      throw new Error("Drill-down cache byte budget is invalid");
    }
    this.now = options.now ?? Date.now;
  }

  private drop(key: string): void {
    const stored = this.entries.get(key);
    if (!stored) return;
    this.entries.delete(key);
    this.totalBytes -= stored.bytes;
  }

  put(sessionId: string, videoRef: string, value: VideoDrilldownPutValue): void {
    if (!sessionId || sessionId.length > 128 || !videoRef || videoRef.length > 4096) {
      throw new Error("Drill-down cache key is invalid");
    }
    const { frames, totalBytes } = validateFrames(value);
    if (this.options.maxTotalBytes !== undefined && totalBytes > this.options.maxTotalBytes) {
      throw new Error("Drill-down entry exceeds the cache byte budget");
    }
    const key = cacheKey(sessionId, videoRef);
    this.drop(key);
    this.entries.set(key, {
      bytes: totalBytes,
      durationSeconds: value.durationSeconds,
      expiresAt: this.now() + this.options.ttlMs,
      frames,
      sessionId,
    });
    this.totalBytes += totalBytes;
    while (
      this.entries.size > this.options.maxEntries ||
      (this.options.maxTotalBytes !== undefined && this.totalBytes > this.options.maxTotalBytes)
    ) {
      const oldest = this.entries.keys().next().value;
      if (!oldest || oldest === key) break;
      this.drop(oldest);
    }
  }

  get(
    sessionId: string,
    videoRef: string,
    options: { endSeconds?: number; frameCount?: number; startSeconds?: number } = {}
  ): VideoDrilldownResult | null {
    const key = cacheKey(sessionId, videoRef);
    const stored = this.entries.get(key);
    if (!stored) return null;
    if (stored.expiresAt <= this.now()) {
      this.drop(key);
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, stored);
    const hasFocus = options.startSeconds !== undefined || options.endSeconds !== undefined;
    let focusWindow: VideoFocusWindow | null = null;
    try {
      focusWindow = hasFocus
        ? resolveVideoFocusWindow(stored.durationSeconds, {
            endSeconds: options.endSeconds,
            startSeconds: options.startSeconds,
          })
        : null;
    } catch {
      return null;
    }
    const frameCount =
      options.frameCount === undefined
        ? 16
        : Number.isInteger(options.frameCount) &&
            options.frameCount >= 1 &&
            options.frameCount <= 16
          ? options.frameCount
          : null;
    if (frameCount === null) return null;
    const frames = stored.frames
      .filter(
        (frame) =>
          !focusWindow ||
          (frame.timestampSeconds >= focusWindow.startSeconds &&
            frame.timestampSeconds <= focusWindow.endSeconds)
      )
      .slice(0, frameCount)
      .map((frame) => ({ ...frame }));
    if (frames.length === 0) return null;
    return {
      durationSeconds: stored.durationSeconds,
      ...(focusWindow ? { focusWindow } : {}),
      frames,
    };
  }

  clearSession(sessionId: string): number {
    let removed = 0;
    for (const [key, entry] of this.entries.entries()) {
      if (entry.sessionId === sessionId) {
        this.drop(key);
        removed += 1;
      }
    }
    return removed;
  }

  clearAll(): void {
    this.entries.clear();
    this.totalBytes = 0;
  }
}
