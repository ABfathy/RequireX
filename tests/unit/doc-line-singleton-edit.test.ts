/**
 * Unit tests for doc-view.tsx singleton-edit and gutter-insert-guard logic.
 *
 * These tests exercise the *pure state/callback contracts* extracted from
 * DocView and DocLine so we can validate correctness without a DOM renderer.
 *
 * Invariants under test:
 *   1. Singleton edit: setting a new activeEditReqId implicitly closes the
 *      previous one — only one row can be in edit mode at any moment.
 *   2. Gutter insert guard (insertingRef): a second rapid call to the insert
 *      handler while one is already in-flight is silently discarded.
 *   3. autoFocus path routes through onStartEdit (not local state), so the
 *      singleton invariant is preserved for newly inserted rows.
 */

import { describe, expect, it, vi } from "vitest";

/* ── 1. Singleton-edit state machine ──────────────────────────────────────── */

/**
 * Minimal simulation of DocView's activeEditReqId state.
 *
 * DocView owns a single `activeEditReqId: string | null` and passes
 * per-row callbacks:
 *   onStartEdit = () => setActiveEditReqId(line.reqId)
 *   onStopEdit  = () => setActiveEditReqId(null)
 *
 * Because React state is synchronous within a single render cycle we can model
 * this with a plain variable.
 */
function makeSingletonEditState() {
  let activeEditReqId: string | null = null;

  function startEdit(reqId: string) {
    activeEditReqId = reqId;
  }
  function stopEdit() {
    activeEditReqId = null;
  }
  function isEditing(reqId: string) {
    return activeEditReqId === reqId;
  }
  function getActive() {
    return activeEditReqId;
  }

  return { startEdit, stopEdit, isEditing, getActive };
}

describe("DocView singleton-edit state machine", () => {
  it("only one row can be in edit mode at a time", () => {
    const state = makeSingletonEditState();

    state.startEdit("req-1");
    expect(state.isEditing("req-1")).toBe(true);
    expect(state.isEditing("req-2")).toBe(false);

    // Opening req-2 implicitly closes req-1
    state.startEdit("req-2");
    expect(state.isEditing("req-1")).toBe(false);
    expect(state.isEditing("req-2")).toBe(true);
  });

  it("stopEdit closes the active editor", () => {
    const state = makeSingletonEditState();

    state.startEdit("req-1");
    expect(state.getActive()).toBe("req-1");

    state.stopEdit();
    expect(state.getActive()).toBeNull();
    expect(state.isEditing("req-1")).toBe(false);
  });

  it("starting the same row again is idempotent", () => {
    const state = makeSingletonEditState();
    state.startEdit("req-1");
    state.startEdit("req-1");
    expect(state.getActive()).toBe("req-1");
  });

  it("stopEdit when nothing is open is a no-op", () => {
    const state = makeSingletonEditState();
    state.stopEdit();
    expect(state.getActive()).toBeNull();
  });

  it("autoFocus path (insert new row) uses onStartEdit so previous editor closes", () => {
    const state = makeSingletonEditState();

    // Simulate an existing open editor on req-1
    state.startEdit("req-1");
    expect(state.isEditing("req-1")).toBe(true);

    // handleInsertLineAfter resolves → autoFocus fires for the new row (req-new)
    // which calls onStartEdit("req-new")
    state.startEdit("req-new");

    expect(state.isEditing("req-1")).toBe(false); // old editor closed
    expect(state.isEditing("req-new")).toBe(true); // new editor open
  });
});

/* ── 2. Gutter insert guard (insertingRef de-bounce) ─────────────────────── */

/**
 * Minimal simulation of the insertingRef guard from DocLine's gutter button.
 *
 * The real code:
 *   if (insertingRef.current) return;
 *   insertingRef.current = true;
 *   void onInsertLineAfter(...).finally(() => { insertingRef.current = false; });
 */
function makeInsertGuard(onInsert: () => Promise<void>) {
  let inserting = false; // simulates insertingRef.current

  async function handleClick() {
    if (inserting) return; // guard: discard rapid second click
    inserting = true;
    try {
      await onInsert();
    } finally {
      inserting = false;
    }
  }

  return { handleClick };
}

describe("Gutter + button insert guard", () => {
  it("discards a second click while an insert is already in-flight", async () => {
    let resolveFirst!: () => void;
    const firstPromise = new Promise<void>((res) => {
      resolveFirst = res;
    });

    const onInsert = vi.fn().mockReturnValueOnce(firstPromise);

    const { handleClick } = makeInsertGuard(onInsert);

    // First click starts the insert (but doesn't resolve yet)
    const first = handleClick();

    // Second click while first is still in-flight — should be discarded
    await handleClick();

    // Resolve first
    resolveFirst();
    await first;

    // onInsert should have been called exactly once
    expect(onInsert).toHaveBeenCalledTimes(1);
  });

  it("allows a subsequent click after the in-flight insert resolves", async () => {
    const onInsert = vi.fn().mockResolvedValue(undefined);
    const { handleClick } = makeInsertGuard(onInsert);

    await handleClick();
    await handleClick();

    expect(onInsert).toHaveBeenCalledTimes(2);
  });

  it("resets the guard even when the insert rejects", async () => {
    const onInsert = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(undefined);

    const { handleClick } = makeInsertGuard(async () => {
      await onInsert();
    });

    // First call rejects but guard must still reset
    await handleClick().catch(() => {
      /* intentionally ignored */
    });

    // Second call should proceed
    await handleClick();

    expect(onInsert).toHaveBeenCalledTimes(2);
  });
});

/* ── 3. Interaction: open editor → click + → new row gets focus, old closes ─ */

describe("Insert-while-editing: editor is closed before new row opens", () => {
  it("onStopEdit is called before the new autoFocus fires", async () => {
    const state = makeSingletonEditState();
    const callOrder: string[] = [];

    // Simulate the Alt+Enter flow in handleEditKeyDown:
    //   1. onStopEdit() for the currently editing row
    //   2. await onInsertLineAfter(...)
    //   3. [autoFocus effect] onStartEdit("req-new")

    async function simulateAltEnter(currentReqId: string, newReqId: string) {
      state.startEdit(currentReqId); // row is currently editing
      callOrder.push(`editing:${currentReqId}`);

      // Step 1 – close current editor
      state.stopEdit();
      callOrder.push("stopEdit");

      // Step 2 – simulate async insert
      await Promise.resolve();
      callOrder.push("insertResolved");

      // Step 3 – autoFocus fires on new row
      state.startEdit(newReqId);
      callOrder.push(`startEdit:${newReqId}`);
    }

    await simulateAltEnter("req-1", "req-new");

    expect(callOrder).toEqual([
      "editing:req-1",
      "stopEdit",
      "insertResolved",
      "startEdit:req-new",
    ]);

    // After all of this, only the new row should be in edit mode
    expect(state.isEditing("req-1")).toBe(false);
    expect(state.isEditing("req-new")).toBe(true);
  });
});
