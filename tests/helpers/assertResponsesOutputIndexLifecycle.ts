/**
 * Validates the Responses-API output_index lifecycle invariant that real
 * clients (e.g. OpenClaw's outputSlots tracker) enforce: an output_index
 * claimed by response.output_item.added must be closed by a matching
 * response.output_item.done before any later item reuses that same index.
 *
 * Existing coverage (responses-reasoning-close-before-message-466.test.ts)
 * asserts this invariant by hand for one specific emitter path (the real
 * translator/transformer). This helper generalizes that check so any SSE
 * event sequence — including hand-rolled synthetic frames like the early
 * keepalive placeholder — can be verified against the same contract a real
 * downstream client applies, without duplicating the tracking logic per test.
 *
 * Mirrors OpenClaw's createResponsesOutputSlotTracker() closely enough to
 * reproduce the exact failure mode: "Responses stream reused active output
 * index N" (see OpenClaw issue #123342 / the RESPONSES_STARTUP_THINKING_FRAME
 * missing-output_item.done incident this helper was added for).
 */

export type ResponsesLifecycleEvent = { event?: string; data: Record<string, unknown> };

export function assertResponsesOutputIndexLifecycle(
  events: ResponsesLifecycleEvent[],
  options: { requireAllClosed?: boolean } = {}
): void {
  const open = new Map<number, unknown>();

  for (const { data } of events) {
    const type = data?.type;
    if (type !== "response.output_item.added" && type !== "response.output_item.done") continue;

    const outputIndex = data.output_index;
    if (typeof outputIndex !== "number") continue;

    if (type === "response.output_item.added") {
      if (open.has(outputIndex)) {
        const item = data.item as { id?: unknown; type?: unknown } | undefined;
        throw new Error(
          `Responses stream reused active output index ${outputIndex} ` +
            `(item id=${String(item?.id)} type=${String(item?.type)} was still open)`
        );
      }
      open.set(outputIndex, data.item);
    } else {
      open.delete(outputIndex);
    }
  }

  if (options.requireAllClosed !== false && open.size > 0) {
    const stillOpen = [...open.keys()].join(", ");
    throw new Error(
      `Responses stream left output index(es) open with no output_item.done: ${stillOpen}`
    );
  }
}
