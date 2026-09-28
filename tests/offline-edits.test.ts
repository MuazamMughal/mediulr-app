import test from "node:test";
import assert from "node:assert/strict";
import { applyEdits, createEditStore, type PendingEdit } from "../src/features/offline/editStore";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    async getItem(key: string) { return data.get(key) ?? null; },
    async setItem(key: string, value: string) { data.set(key, value); },
  };
}

const edit = (opId: string, action: PendingEdit["action"], id: string, values: Record<string, unknown> = {}, userId = "user-a"): PendingEdit =>
  ({ opId, userId, table: "medications", action, id, values, queuedAt: 1000 });

test("offline edits persist across restart and replay in dependency order", async () => {
  const storage = memoryStorage();
  const first = createEditStore(storage);
  const parent = { ...edit("1", "create", "profile-1", { id: "profile-1" }), table: "profiles" as const };
  const child = edit("2", "create", "med-1", { id: "med-1", profile_id: "profile-1" });
  await first.enqueue([parent, child]);
  const restarted = createEditStore(storage);
  await restarted.load();
  assert.equal(restarted.list().length, 2);
  const sent: string[] = [];
  await restarted.flush("user-a", async (item) => { sent.push(item.opId); });
  assert.deepEqual(sent, ["1", "2"]);
  assert.deepEqual(restarted.list(), []);
});

test("offline edits show creates, updates and deletes over cached rows", () => {
  const base = [{ id: "a", name: "old", profile_id: "p" }, { id: "b", name: "remove", profile_id: "p" }];
  const pending = [edit("1", "create", "c", { id: "c", name: "new", profile_id: "p" }),
    edit("2", "update", "a", { name: "changed" }), edit("3", "delete", "b")];
  assert.deepEqual(applyEdits(base, pending, "user-a", "medications"),
    [{ id: "a", name: "changed", profile_id: "p" }, { id: "c", name: "new", profile_id: "p" }]);
  assert.deepEqual(applyEdits(base, pending, "user-b", "medications"), base);
});

test("a temporary connection failure retains the whole ordered queue", async () => {
  const storage = memoryStorage();
  const store = createEditStore(storage);
  await store.enqueue([edit("1", "create", "a", { id: "a" }), edit("2", "update", "a", { name: "x" })]);
  await store.flush("user-a", async () => { throw new Error("Failed to fetch"); });
  assert.deepEqual(store.list().map((item) => item.opId), ["1", "2"]);
  assert.equal(store.list()[0].failed, undefined);
});

test("a server rejection remains visible and blocks dependent changes until retried or discarded", async () => {
  const storage = memoryStorage();
  const store = createEditStore(storage);
  await store.enqueue([edit("1", "create", "a", { id: "a" }), edit("2", "update", "a", { name: "x" })]);
  const sent: string[] = [];
  await store.flush("user-a", async (item) => {
    sent.push(item.opId);
    throw Object.assign(new Error("Invalid row"), { code: "23514" });
  });
  assert.deepEqual(sent, ["1"]);
  assert.equal(store.list()[0].failed, "Invalid row");
  await store.retryFailed("user-a");
  await store.flush("user-a", async (item) => { sent.push(item.opId); });
  assert.deepEqual(sent, ["1", "1", "2"]);
  assert.deepEqual(store.list(), []);
});

test("storage failure does not acknowledge an unsaved edit", async () => {
  const store = createEditStore({
    async getItem() { return null; },
    async setItem() { throw new Error("storage full"); },
  });
  await assert.rejects(store.enqueue([edit("1", "create", "a", { id: "a" })]), /storage full/);
  assert.deepEqual(store.list(), []);
});

test("a concurrent flush waits for the edit to reach device storage", async () => {
  let finishWrite!: () => void;
  let writeStarted!: () => void;
  let writes = 0;
  const started = new Promise<void>((resolve) => { writeStarted = resolve; });
  const storage = {
    async getItem() { return null; },
    async setItem() {
      writes += 1;
      if (writes !== 1) return;
      writeStarted();
      await new Promise<void>((resolve) => { finishWrite = resolve; });
    },
  };
  const store = createEditStore(storage);
  const enqueuing = store.enqueue([edit("1", "create", "a", { id: "a" })]);
  await started;
  const sent: string[] = [];
  const flushing = store.flush("user-a", async (item) => { sent.push(item.opId); });
  await Promise.resolve();
  assert.deepEqual(sent, []);
  finishWrite();
  await enqueuing;
  await flushing;
  assert.deepEqual(sent, ["1"]);
});

test("edits are scoped by account and sign-out can clear the device queue", async () => {
  const storage = memoryStorage();
  const store = createEditStore(storage);
  await store.enqueue([edit("a", "create", "a", { id: "a" }, "user-a"),
    edit("b", "create", "b", { id: "b" }, "user-b")]);
  const sent: string[] = [];
  await store.flush("user-b", async (item) => { sent.push(item.opId); });
  assert.deepEqual(sent, ["b"]);
  assert.deepEqual(store.list().map((item) => item.opId), ["a"]);
  await store.clear();
  assert.deepEqual(store.list(), []);
});
