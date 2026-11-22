import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryNotes, NotesViewModel } from "./viewmodel.js";

test("add moves the status from empty to ready and returns Result values", () => {
  const viewModel = new NotesViewModel(new InMemoryNotes());
  assert.equal(viewModel.status(), "empty");

  const added = viewModel.add("  lead call  ");
  assert.equal(added.ok, true);
  if (added.ok) {
    assert.equal(added.value.title, "lead call");
  }
  assert.equal(viewModel.status(), "ready");
  assert.equal(viewModel.snapshot().length, 1);
});

test("add rejects titles outside 1..120 without touching the port", () => {
  const notes = new InMemoryNotes();
  const viewModel = new NotesViewModel(notes);

  const empty = viewModel.add("");
  const long = viewModel.add("x".repeat(121));

  assert.equal(empty.ok, false);
  assert.equal(long.ok, false);
  assert.equal(notes.list().length, 0);
});

test("refresh surfaces port failures as a Result, not a throw", () => {
  const failing = new NotesViewModel({
    list: () => {
      throw new Error("store offline");
    },
    add: () => {
      throw new Error("unreachable");
    },
  });
  const refreshed = failing.refresh();
  assert.equal(refreshed.ok, false);
  if (!refreshed.ok) {
    assert.equal(refreshed.error, "store offline");
  }
});

test("snapshot is a copy and subscribe notifies until unsubscribed", () => {
  const notes = new InMemoryNotes();
  const viewModel = new NotesViewModel(notes);

  let calls = 0;
  const stop = viewModel.subscribe(() => {
    calls += 1;
  });
  viewModel.add("one");
  stop();
  viewModel.add("two");

  assert.equal(calls, 1);
  const snapshot = viewModel.snapshot();
  notes.add("three");
  assert.equal(snapshot.length, 2);
  assert.equal(viewModel.snapshot().length, 2);
  viewModel.refresh();
  assert.equal(viewModel.snapshot().length, 3);
});
