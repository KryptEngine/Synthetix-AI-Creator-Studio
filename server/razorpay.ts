import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'https://api.razorpay.com/v1';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  payoutAccountId: string;
}

export function razorpayConfig(): RazorpayConfig {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    payoutAccountId: process.env.RAZORPAY_PAYOUT_ACCOUNT_ID || ''
  };
}

export function razorpayConfigured(): boolean {
  const { keyId, keySecret } = razorpayConfig();
  return Boolean(keyId && keySecret);
}

export function razorpayPayoutConfigured(): boolean {
  const { keyId, keySecret, payoutAccountId } = razorpayConfig();
  return Boolean(keyId && keySecret && payoutAccountId);
}

function authHeader(): string {
  const { keyId, keySecret } = razorpayConfig();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function razorpayRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader()
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let parsed: any = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { error: { description: text.slice(0, 200) } };
  }

  if (!response.ok) {
    const message = parsed?.error?.description || parsed?.message || `Razorpay returned ${response.status}`;
    throw new Error(message);
  }
  return parsed as T;
}

export interface CreatedOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/** Creates a Razorpay order. Amounts are supplied in paise. */
export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreatedOrder> {
  const order = await razorpayRequest<any>('/orders', {
    amount: input.amountPaise,
    currency: 'INR',
    receipt: input.receipt,
    notes: input.notes || {},
    payment_capture: 1
  });

  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status
  };
}

/**
 * Verifies the checkout signature the browser returns. Razorpay signs
 * `order_id|payment_id` with the key secret using HMAC-SHA256.
 */
export function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = razorpayConfig();
  if (!keySecret || !input.orderId || !input.paymentId || !input.signature) return false;

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(input.signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verifies the webhook signature over the exact raw request body. */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
  const { webhookSecret } = razorpayConfig();
  if (!webhookSecret || !signature) return false;

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface PayoutResult {
  id: string;
  status: string;
  amount: number;
}

/**
 * Creates a RazorpayX payout to a UPI/bank account. Requires RazorpayX to be
 * enabled on the merchant account.
 */
export async function createPayout(input: {
  accountNumber: string;
  ifscCode: string;
  vpa?: string;
  name: string;
  amountPaise: number;
  referenceId: string;
  notes?: Record<string, string>;
}): Promise<PayoutResult> {
  const { payoutAccountId } = razorpayConfig();

  const payout = await razorpayRequest<any>('/payouts', {
    account_number: input.accountNumber,
    ifsc_code: input.ifscCode,
    vpa: input.vpa || undefined,
    name: input.name,
    amount: input.amountPaise,
    currency: 'INR',
    mode: 'UPI',
    purpose: 'payout',
    reference_id: input.referenceId,
    account_id: payoutAccountId,
    notes: input.notes || {}
  });

  return { id: payout.id, status: payout.status, amount: payout.amount };
}
