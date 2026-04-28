import crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';
import * as rampStore from '../store/ramp-store.js';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
  } catch {
    return false;
  }
}

export async function handlePartnaWebhook(request: FastifyRequest, reply: FastifyReply) {
  const signature = request.headers['x-partna-signature'] as string;
  const rawBody = JSON.stringify(request.body);

  // 1. Verify signature
  if (!verifyWebhookSignature(rawBody, signature, config.partnaWebhookSecret)) {
    return reply.status(401).send({ error: 'Invalid signature' });
  }

  const { event, data } = request.body as any;

  try {
    const order = rampStore.getOrder(data.orderId);
    if (!order) {
      console.warn(`Webhook received for unknown order: ${data.orderId}`);
      return reply.status(200).send({ received: true, error: 'unknown_order' });
    }

    switch (event) {
      case 'onramp.completed': {
        rampStore.updateOrderStatus(data.orderId, 'completed', {
          amountCrypto: data.cryptoAmount
        });
        // Business logic: here we could trigger notifications or 
        // internal flags that the contribution is ready to be signed.
        break;
      }

      case 'onramp.failed': {
        rampStore.updateOrderStatus(data.orderId, 'failed', {
          failureReason: data.reason
        });
        break;
      }

      case 'offramp.completed': {
        rampStore.updateOrderStatus(data.orderId, 'completed');
        break;
      }

      case 'offramp.failed': {
        rampStore.updateOrderStatus(data.orderId, 'failed', {
          failureReason: data.reason
        });
        break;
      }
    }

    return reply.status(200).send({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 so Partna doesn't retry endlessly
    return reply.status(200).send({ received: true, error: 'internal_error' });
  }
}
