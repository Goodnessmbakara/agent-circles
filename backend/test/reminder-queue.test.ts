import { describe, it, expect, beforeEach } from "vitest";
import * as queue from "../src/store/reminder-queue.js";

const CONTRACT = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const MEMBER = "GABC123XYZ";

describe("reminder-queue", () => {
  beforeEach(() => {
    queue._reset();
  });

  it("adds a reminder and retrieves it when due", () => {
    const now = 1000;
    queue.add(CONTRACT, MEMBER, now - 1, "pay up");
    const due = queue.getDue(now);
    expect(due).toHaveLength(1);
    expect(due[0].message).toBe("pay up");
    expect(due[0].member).toBe(MEMBER);
  });

  it("does not return future reminders", () => {
    const now = 1000;
    queue.add(CONTRACT, MEMBER, now + 100, "future");
    expect(queue.getDue(now)).toHaveLength(0);
  });

  it("markDelivered hides the reminder from getDue", () => {
    const now = 1000;
    const r = queue.add(CONTRACT, MEMBER, now - 1, "pay up");
    queue.markDelivered(r.id);
    expect(queue.getDue(now)).toHaveLength(0);
  });

  it("inserts reminders in sorted order", () => {
    queue.add(CONTRACT, MEMBER, 3000, "third");
    queue.add(CONTRACT, MEMBER, 1000, "first");
    queue.add(CONTRACT, MEMBER, 2000, "second");
    const due = queue.getDue(3000);
    expect(due[0].message).toBe("first");
    expect(due[1].message).toBe("second");
    expect(due[2].message).toBe("third");
  });

  it("returns multiple due reminders", () => {
    queue.add(CONTRACT, MEMBER, 500, "a");
    queue.add(CONTRACT, MEMBER, 600, "b");
    queue.add(CONTRACT, MEMBER, 2000, "c");
    const due = queue.getDue(1000);
    expect(due).toHaveLength(2);
  });
});
