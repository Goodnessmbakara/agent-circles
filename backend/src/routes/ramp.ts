import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PartnaService } from "../ramp/partna.service.js";
import { handlePartnaWebhook } from "../ramp/partna.webhook.js";

const OnRampSchema = z.object({
  poolId: z.string(),
  userId: z.string(),
  amountNGN: z.number().positive(),
  stellarWalletAddress: z.string(),
});

const OffRampSchema = z.object({
  poolId: z.string(),
  userId: z.string(),
  amountUSDC: z.number().positive(),
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
});

export async function rampRoutes(app: FastifyInstance) {
  // Create on-ramp order
  app.post("/ramp/onramp", async (request) => {
    const body = OnRampSchema.parse(request.body);
    
    const result = await PartnaService.createOnRamp(body.poolId, body.userId, {
      amount: body.amountNGN,
      currency: 'NGN',
      cryptoCurrency: 'USDC',
      network: 'stellar',
      walletAddress: body.stellarWalletAddress,
      reference: `onramp-${body.poolId}-${body.userId}-${Date.now()}`,
    });

    return { data: result };
  });

  // Create off-ramp order
  app.post("/ramp/offramp", async (request) => {
    const body = OffRampSchema.parse(request.body);

    const result = await PartnaService.createOffRamp(body.poolId, body.userId, {
      amount: body.amountUSDC,
      cryptoCurrency: 'USDC',
      network: 'stellar',
      currency: 'NGN',
      bankCode: body.bankCode,
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      reference: `offramp-${body.poolId}-${body.userId}-${Date.now()}`,
    });

    return { data: result };
  });

  // Check order status (polling)
  app.get("/ramp/order/:id", async (request) => {
    const { id } = request.params as { id: string };
    const order = await PartnaService.getOrder(id);
    if (!order) {
      throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    }
    return { data: order };
  });

  // Webhook handler
  app.post(
    "/webhooks/partna",
    // Fastify handles JSON by default, but signature verification 
    // might need the raw body. For simplicity, we'll use JSON.stringify 
    // in the handler for now as per the plan.
    handlePartnaWebhook
  );
}
