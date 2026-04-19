import { describe, it, expect, beforeEach } from "vitest";
import * as registry from "../src/store/pool-registry.js";

// Reset registry between tests by unregistering all
const TEST_ID_1 = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const TEST_ID_2 = "CABC123SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCABC";

describe("pool-registry", () => {
  beforeEach(() => {
    registry.unregister(TEST_ID_1);
    registry.unregister(TEST_ID_2);
  });

  it("registers and lists a contract ID", () => {
    registry.register(TEST_ID_1);
    expect(registry.listIds()).toContain(TEST_ID_1);
  });

  it("has() returns true after register", () => {
    registry.register(TEST_ID_1);
    expect(registry.has(TEST_ID_1)).toBe(true);
  });

  it("has() returns false for unknown ID", () => {
    expect(registry.has(TEST_ID_2)).toBe(false);
  });

  it("unregister removes the ID", () => {
    registry.register(TEST_ID_1);
    registry.unregister(TEST_ID_1);
    expect(registry.has(TEST_ID_1)).toBe(false);
  });

  it("listIds returns all registered IDs", () => {
    registry.register(TEST_ID_1);
    registry.register(TEST_ID_2);
    const ids = registry.listIds();
    expect(ids).toContain(TEST_ID_1);
    expect(ids).toContain(TEST_ID_2);
  });

  it("register stores optional display name", () => {
    registry.register(TEST_ID_1, "  My Circle  ");
    expect(registry.getDisplayName(TEST_ID_1)).toBe("My Circle");
    expect(registry.isKeeperEnabled(TEST_ID_1)).toBe(true);
    registry.unregister(TEST_ID_1);
  });

  it("register can disable keeper automation", () => {
    registry.register(TEST_ID_1, "x", false);
    expect(registry.isKeeperEnabled(TEST_ID_1)).toBe(false);
    registry.unregister(TEST_ID_1);
  });
});
