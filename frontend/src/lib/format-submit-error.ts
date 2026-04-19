import type { TxSubmitResult } from "./api";

/** Backend may return a non-string error payload; avoid `[object Object]` in UI. */
export function formatSubmitError(result: TxSubmitResult): string {
  if (result.status === "SUCCESS") return "";
  const e = result.error as unknown;
  if (e == null || e === "") return result.status;
  if (typeof e === "string") return e;
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
