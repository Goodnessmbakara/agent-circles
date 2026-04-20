import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

/** Load `rosca_pool.wasm` from `ROSCA_POOL_WASM_PATH` (resolved from `process.cwd()`). */
export async function readRoscaWasmBuffer(): Promise<Buffer> {
  const p = config.roscaPoolWasmPath;
  const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  try {
    return await fs.readFile(resolved);
  } catch {
    throw Object.assign(
      new Error(
        `Pool WASM not found at ${resolved}. Build it with: stellar contract build --manifest-path contracts/rosca_pool/Cargo.toml`,
      ),
      { statusCode: 503 },
    );
  }
}
