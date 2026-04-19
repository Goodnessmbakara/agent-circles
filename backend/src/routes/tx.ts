import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { submitSignedTx } from "../stellar/tx-submit.js";
import { getTransactionPollOnly } from "../stellar/soroban-get-transaction-raw.js";

const SubmitSchema = z.object({ signed_xdr: z.string() });

export async function txRoutes(app: FastifyInstance) {
  // Submit a client-signed transaction and wait for confirmation
  app.post("/tx/submit", async (request) => {
    const body = SubmitSchema.parse(request.body);
    const result = await submitSignedTx(body.signed_xdr);
    return { data: result };
  });

  // Poll transaction status by hash
  app.get<{ Params: { hash: string } }>("/tx/:hash", async (request) => {
    const result = await getTransactionPollOnly(request.params.hash);
    return {
      data: {
        status: result.status,
        ledger: result.ledger,
      },
    };
  });
}
