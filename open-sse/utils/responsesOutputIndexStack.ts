/**
 * @file responsesOutputIndexStack.ts
 * @description Structural guard against the Responses-API output_index
 * collision bug class (OpenClaw issue #123342): a hand-tracked output_index
 * that an emitter forgets to close before the same number gets reused.
 *
 * Responses-API output items open and close one at a time within any single
 * emitter — there is never a real need to hold two indices open
 * simultaneously from one emitter's own bookkeeping. Modeling allocation as
 * a stack makes "forgot to close" a structural impossibility instead of a
 * silent bug: open() always returns the next sequential index, close()
 * requires the caller to name the index being closed and throws if it does
 * not match the top of the stack, and assertAllClosed() — called once the
 * caller has finished building its frame/events — throws if anything is
 * still open. For a module-level constant frame (like the early keepalive
 * placeholder), that last check runs at import time: a regression here fails
 * the build/boot instead of shipping a malformed stream to production.
 */

export class ResponsesOutputIndexStack {
  private readonly openIndices: number[] = [];
  private nextIndex = 0;

  open(): number {
    const index = this.nextIndex;
    this.nextIndex += 1;
    this.openIndices.push(index);
    return index;
  }

  close(index: number): void {
    const top = this.openIndices.at(-1);
    if (top !== index) {
      throw new Error(
        `ResponsesOutputIndexStack: closing output_index ${index} but the open top was ${String(top)}`
      );
    }
    this.openIndices.pop();
  }

  assertAllClosed(): void {
    if (this.openIndices.length > 0) {
      throw new Error(
        `ResponsesOutputIndexStack: output_index(es) still open with no close(): ${this.openIndices.join(", ")}`
      );
    }
  }
}
