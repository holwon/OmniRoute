export interface ContactSheetFrame {
  dataUri: string;
  timestampSeconds: number;
}

export interface ContactSheetOptions {
  columns?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface VideoContactSheetResult {
  dataUri?: string;
  fallbackReason?: "CONTACT_SHEET_UNAVAILABLE";
  frames: ContactSheetFrame[];
  height?: number;
  timestamps: number[];
  used: boolean;
  width?: number;
}

const MAX_FRAMES = 16;
const MAX_SHEET_BYTES = 32 * 1024 * 1024;
const TILE_SIZE = 512;

function fallback(frames: readonly ContactSheetFrame[]): VideoContactSheetResult {
  return {
    fallbackReason: "CONTACT_SHEET_UNAVAILABLE",
    frames: frames.map((frame) => ({ ...frame })),
    timestamps: frames.map((frame) => frame.timestampSeconds),
    used: false,
  };
}

function decodeFrame(dataUri: string): Buffer {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/i.exec(dataUri);
  if (!match) throw new Error("Contact sheet requires JPEG data URIs");
  return Buffer.from(match[1], "base64");
}

/** Build an optional bounded JPEG grid; every failure except abort is fail-safe to individual frames. */
export async function buildVideoContactSheet(
  frames: readonly ContactSheetFrame[],
  options: ContactSheetOptions = {}
): Promise<VideoContactSheetResult> {
  if (options.signal?.aborted) throw new Error("Video contact sheet was aborted");
  if (frames.length < 1 || frames.length > MAX_FRAMES) return fallback(frames);
  if (
    frames.some(
      (frame) =>
        !Number.isFinite(frame.timestampSeconds) || frame.timestampSeconds < 0 || !frame.dataUri
    )
  ) {
    return fallback(frames);
  }
  const columns = Math.min(4, Math.max(1, Math.floor(options.columns ?? 2)), frames.length);
  const rows = Math.ceil(frames.length / columns);
  const controller = new AbortController();
  const timeout = options.timeoutMs
    ? setTimeout(() => controller.abort(), options.timeoutMs)
    : null;
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;
  try {
    const { default: sharp } = await import("sharp");
    if (signal.aborted) throw new Error("Video contact sheet was aborted");
    const tiles = await Promise.all(
      frames.map(async (frame) =>
        sharp(decodeFrame(frame.dataUri))
          .resize(TILE_SIZE, TILE_SIZE, { fit: "contain", background: "#000000" })
          .jpeg({ quality: 80 })
          .toBuffer()
      )
    );
    if (signal.aborted) throw new Error("Video contact sheet was aborted");
    const output = await sharp({
      create: {
        background: "#000000",
        channels: 3,
        height: rows * TILE_SIZE,
        width: columns * TILE_SIZE,
      },
    })
      .composite(
        tiles.map((input, index) => ({
          input,
          left: (index % columns) * TILE_SIZE,
          top: Math.floor(index / columns) * TILE_SIZE,
        }))
      )
      .jpeg({ quality: 80 })
      .toBuffer();
    if (signal.aborted) throw new Error("Video contact sheet was aborted");
    if (output.byteLength > MAX_SHEET_BYTES) return fallback(frames);
    return {
      dataUri: `data:image/jpeg;base64,${output.toString("base64")}`,
      frames: frames.map((frame) => ({ ...frame })),
      height: rows * TILE_SIZE,
      timestamps: frames.map((frame) => frame.timestampSeconds),
      used: true,
      width: columns * TILE_SIZE,
    };
  } catch (error) {
    if (signal.aborted) throw new Error("Video contact sheet was aborted");
    return fallback(frames);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
