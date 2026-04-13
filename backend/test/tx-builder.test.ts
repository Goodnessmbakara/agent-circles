import { describe, it, expect } from "vitest";
import { Contract, nativeToScVal } from "@stellar/stellar-sdk";

describe("tx-builder", () => {
  it("Contract.call produces invokeHostFunction operation", () => {
    const contractId = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
    const contract = new Contract(contractId);
    const op = contract.call("get_state");
    // In stellar-sdk v13, operation type lives in op.body().switch().name
    expect(op.body().switch().name).toBe("invokeHostFunction");
  });

  it("nativeToScVal encodes i128 correctly", () => {
    const val = nativeToScVal(1_000_000, { type: "i128" });
    expect(val).toBeDefined();
    expect(val.switch().name).toBe("scvI128");
  });

  it("nativeToScVal encodes u32 correctly", () => {
    const val = nativeToScVal(200, { type: "u32" });
    expect(val).toBeDefined();
    expect(val.switch().name).toBe("scvU32");
  });

  it("nativeToScVal encodes u64 correctly", () => {
    const val = nativeToScVal(60, { type: "u64" });
    expect(val).toBeDefined();
    expect(val.switch().name).toBe("scvU64");
  });
});
