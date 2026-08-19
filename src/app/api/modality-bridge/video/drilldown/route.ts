import { createErrorResponse } from "@/lib/api/errorResponse";
import {
  VIDEO_BRIDGE_BROKER_PATH,
  isVideoBridgeBrokerInternalRequest,
} from "@/lib/guardrails/videoBridgeBrokerAuth";
import {
  VideoDrilldownCache,
  type VideoDrilldownFrame,
} from "@/lib/guardrails/videoBridgeDrilldown";
import { resolveModelSyncInternalBaseUrl } from "@/shared/services/modelSyncScheduler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const VIDEO_BRIDGE_DRILLDOWN_PATH = "/api/modality-bridge/video/drilldown";
const MAX_BODY_BYTES = 34 * 1024 * 1024;
const drilldownCache = new VideoDrilldownCache({
  maxEntries: 64,
  // Global decoded-byte ceiling: without it, 64 entries × 32 MiB could pin ~2 GiB.
  maxTotalBytes: 256 * 1024 * 1024,
  ttlMs: 10 * 60 * 1000,
});

function expectedPath(): string {
  const basePath = new URL(resolveModelSyncInternalBaseUrl()).pathname.replace(/\/$/, "");
  return `${basePath}${VIDEO_BRIDGE_DRILLDOWN_PATH}`;
}

function invalid(message: string, status = 400): Response {
  return createErrorResponse({ status, message, type: "invalid_request" });
}

function parseQuery(url: URL): {
  endSeconds?: number;
  frameCount?: number;
  sessionId: string;
  startSeconds?: number;
  videoRef: string;
} | null {
  const allowed = new Set(["end", "frames", "sessionId", "start", "videoRef"]);
  if ([...url.searchParams.keys()].some((key) => !allowed.has(key))) return null;
  const sessionId = url.searchParams.get("sessionId")?.trim() ?? "";
  const videoRef = url.searchParams.get("videoRef")?.trim() ?? "";
  if (!sessionId || !videoRef) return null;
  const parseNumber = (name: string): number | undefined | null => {
    const value = url.searchParams.get(name);
    if (value === null) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  const startSeconds = parseNumber("start");
  const endSeconds = parseNumber("end");
  const rawFrameCount = url.searchParams.get("frames");
  const frameCount =
    rawFrameCount === null
      ? undefined
      : /^\d{1,2}$/.test(rawFrameCount) && Number(rawFrameCount) >= 1 && Number(rawFrameCount) <= 16
        ? Number(rawFrameCount)
        : null;
  if (startSeconds === null || endSeconds === null || frameCount === null) return null;
  return { endSeconds, frameCount, sessionId, startSeconds, videoRef };
}

interface VideoDrilldownRouteDependencies {
  cache?: VideoDrilldownCache;
}

export async function handleVideoDrilldownRequest(
  request: Request,
  dependencies: VideoDrilldownRouteDependencies = {}
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== expectedPath()) return invalid("Invalid Video Bridge drill-down path", 404);
  if (!isVideoBridgeBrokerInternalRequest(request, VIDEO_BRIDGE_BROKER_PATH)) {
    return invalid("This endpoint requires an authenticated internal loopback request", 403);
  }
  const cache = dependencies.cache ?? drilldownCache;
  if (request.method === "GET") {
    const query = parseQuery(url);
    if (!query) return invalid("Invalid Video Bridge drill-down query");
    const result = cache.get(query.sessionId, query.videoRef, query);
    return result
      ? Response.json(result, { headers: { "Cache-Control": "no-store" } })
      : invalid("Video Bridge drill-down result was not found", 404);
  }
  if (request.method === "DELETE") {
    const sessionId = url.searchParams.get("sessionId")?.trim() ?? "";
    if (!sessionId || [...url.searchParams.keys()].some((key) => key !== "sessionId")) {
      return invalid("A sessionId is required");
    }
    return Response.json({ removed: cache.clearSession(sessionId) });
  }
  if (request.method !== "POST") return invalid("Invalid Video Bridge drill-down method", 405);
  if (request.headers.get("content-type")?.toLowerCase() !== "application/json") {
    return invalid("Video Bridge drill-down requires application/json");
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return invalid("Video Bridge drill-down payload is too large", 413);
  }
  let body: unknown;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BODY_BYTES)
      return invalid("Video Bridge drill-down payload is too large", 413);
    body = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    return invalid("Video Bridge drill-down payload is invalid");
  }
  if (!body || typeof body !== "object")
    return invalid("Video Bridge drill-down payload is invalid");
  const record = body as Record<string, unknown>;
  if (
    typeof record.sessionId !== "string" ||
    typeof record.videoRef !== "string" ||
    typeof record.durationSeconds !== "number" ||
    !Array.isArray(record.frames)
  ) {
    return invalid("Video Bridge drill-down payload is invalid");
  }
  try {
    cache.put(record.sessionId, record.videoRef, {
      durationSeconds: record.durationSeconds,
      frames: record.frames as VideoDrilldownFrame[],
    });
  } catch {
    return invalid("Video Bridge drill-down payload is invalid");
  }
  return Response.json({ stored: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  return handleVideoDrilldownRequest(request);
}

export async function GET(request: Request): Promise<Response> {
  return handleVideoDrilldownRequest(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleVideoDrilldownRequest(request);
}
