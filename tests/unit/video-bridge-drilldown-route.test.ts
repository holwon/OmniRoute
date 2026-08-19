import assert from "node:assert/strict";
import test from "node:test";

import { handleVideoDrilldownRequest } from "../../src/app/api/modality-bridge/video/drilldown/route";
import { buildVideoBridgeBrokerHeaders } from "../../src/lib/guardrails/videoBridgeBrokerAuth";
import { VideoDrilldownCache } from "../../src/lib/guardrails/videoBridgeDrilldown";
import { AUTHZ_HEADER_PEER_LOCALITY } from "../../src/server/authz/headers";
import { isLocalOnlyPath } from "../../src/server/authz/routeGuard";

function headers(contentType?: string): Headers {
  return new Headers({
    ...buildVideoBridgeBrokerHeaders(),
    [AUTHZ_HEADER_PEER_LOCALITY]: "loopback",
    ...(contentType ? { "Content-Type": contentType } : {}),
  });
}

test("drill-down route is loopback/token protected and has no public fallback", async () => {
  assert.equal(isLocalOnlyPath("/api/modality-bridge/video/drilldown", "GET"), true);
  const response = await handleVideoDrilldownRequest(
    new Request("http://localhost/api/modality-bridge/video/drilldown?sessionId=s&videoRef=v")
  );
  assert.equal(response.status, 403);
});

test("drill-down route stores, slices, and deletes an isolated session result", async () => {
  const cache = new VideoDrilldownCache({ maxEntries: 4, now: () => 1000, ttlMs: 5000 });
  const post = await handleVideoDrilldownRequest(
    new Request("http://localhost/api/modality-bridge/video/drilldown", {
      body: JSON.stringify({
        durationSeconds: 10,
        frames: [
          { dataUri: "data:image/jpeg;base64,QQ==", timestampSeconds: 1 },
          { dataUri: "data:image/jpeg;base64,Qg==", timestampSeconds: 5 },
        ],
        sessionId: "session-a",
        videoRef: "video-a",
      }),
      headers: headers("application/json"),
      method: "POST",
    }),
    { cache }
  );
  assert.equal(post.status, 201);

  const get = await handleVideoDrilldownRequest(
    new Request(
      "http://localhost/api/modality-bridge/video/drilldown?sessionId=session-a&videoRef=video-a&start=2&end=6&frames=1",
      { headers: headers() }
    ),
    { cache }
  );
  assert.equal(get.status, 200);
  assert.deepEqual((await get.json()).frames, [
    { dataUri: "data:image/jpeg;base64,Qg==", timestampSeconds: 5 },
  ]);

  const deleted = await handleVideoDrilldownRequest(
    new Request("http://localhost/api/modality-bridge/video/drilldown?sessionId=session-a", {
      headers: headers(),
      method: "DELETE",
    }),
    { cache }
  );
  assert.deepEqual(await deleted.json(), { removed: 1 });
});
