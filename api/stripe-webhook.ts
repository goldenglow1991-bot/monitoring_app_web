import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { planTiers } from '../src/stripePrices.js';

// StripeのWebhook署名検証には生のリクエストボディが必要なため、
// Vercelの自動bodyパースを無効化する。
export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function planKeyForPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  return planTiers.find((t) => t.stripePriceId === priceId)?.key ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = req.headers['stripe-signature'];
  const rawBody = await readRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature as string, webhookSecret);
  } catch (e) {
    res.status(400).json({ error: 'invalid_signature', detail: String(e) });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  async function applySubscription(sub: Stripe.Subscription) {
    const uid = sub.metadata?.supabase_user_id;
    if (!uid) return;
    const priceId = sub.items.data[0]?.price?.id;
    const { error } = await admin
      .from('facility_config')
      .update({
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        subscription_plan: planKeyForPriceId(priceId),
      })
      .eq('user_id', uid);
    if (error) throw error;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (typeof session.subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await applySubscription(sub);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // event.data.objectはこのイベントが発生した時点のスナップショットであり、
        // Stripeはイベントの配信順序を保証していない。短時間に複数回の変更が
        // あった場合、古いイベントが後から届いて新しい状態を上書きしないよう、
        // 常にAPIから最新の状態を取り直してから反映する。
        const subId = (event.data.object as Stripe.Subscription).id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await applySubscription(sub);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    res.status(500).json({ error: 'processing_failed', detail: String(e) });
    return;
  }

  res.status(200).json({ received: true });
}
