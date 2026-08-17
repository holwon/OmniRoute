import test from "node:test";
import assert from "node:assert/strict";

import { ResponsesOutputIndexStack } from "../../open-sse/utils/responsesOutputIndexStack.ts";

test("open() allocates sequential indices starting at 0", () => {
  const stack = new ResponsesOutputIndexStack();
  assert.equal(stack.open(), 0);
  assert.equal(stack.open(), 1);
});

test("close() on the current top does not throw", () => {
  const stack = new ResponsesOutputIndexStack();
  const index = stack.open();
  assert.doesNotThrow(() => stack.close(index));
});

test("close() with a mismatched index throws (catches the exact keepalive bug shape)", () => {
  const stack = new ResponsesOutputIndexStack();
  const first = stack.open();
  stack.open();
  assert.throws(() => stack.close(first), /closing output_index 0 but the open top was 1/);
});

test("assertAllClosed() passes when everything opened was closed", () => {
  const stack = new ResponsesOutputIndexStack();
  const index = stack.open();
  stack.close(index);
  assert.doesNotThrow(() => stack.assertAllClosed());
});

test("assertAllClosed() throws when an index was never closed — the exact regression this stack prevents", () => {
  const stack = new ResponsesOutputIndexStack();
  stack.open();
  assert.throws(() => stack.assertAllClosed(), /still open with no close/);
});

test("a later open() after a forgotten close() gets the next index, never a reused one", () => {
  // This is the structural guarantee replacing the old hand-tracked literal
  // output_index: 0 in RESPONSES_STARTUP_THINKING_FRAME: even if a caller
  // forgets to close(), the next open() can never collide with it.
  const stack = new ResponsesOutputIndexStack();
  const first = stack.open();
  const second = stack.open();
  assert.notEqual(first, second);
});
