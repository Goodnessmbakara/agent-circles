import type { TxSubmitResult } from "./api";

const TX_RESULT_CODES: Record<number, string> = {
  0: "success",
  "-1": "one or more operations failed",
  "-2": "transaction submitted too early",
  "-3": "transaction expired — try again",
  "-4": "no operation specified",
  "-5": "bad sequence number",
  "-6": "bad auth / wrong network",
  "-7": "insufficient balance",
  "-8": "source account not found",
  "-9": "fee too small",
  "-10": "extra unused signatures",
  "-11": "internal Stellar error",
};

function decodeResultCode(raw: string): string | null {
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length >= 12) {
      const code = buf.readInt32BE(8);
      return TX_RESULT_CODES[code] ?? `result code ${code}`;
    }
  } catch {
    // not XDR
  }
  return null;
}

/** Backend may return a non-string error payload; avoid `[object Object]` in UI. */
export function formatSubmitError(result: TxSubmitResult): string {
  if (result.status === "SUCCESS") return "";
  const e = result.error as unknown;
  if (e == null || e === "") return result.status;
  if (typeof e === "string") {
    const decoded = decodeResultCode(e);
    return decoded ?? e;
  }
  if (e instanceof Error) return e.message;
  if (typeof e === "object") {
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}
