import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { planTiers } from '../src/stripePrices.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const authHeader = req.headers.authorization ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!accessToken) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey || !serviceRoleKey || !stripeSecretKey) {
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const uid = userData.user.id;

  const { origin, planKey, interval } = (req.body ?? {}) as { origin?: string; planKey?: string; interval?: string };
  if (!origin) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: config, error: configError } = await admin
    .from('facility_config')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('user_id', uid)
    .maybeSingle();
  if (configError || !config?.stripe_customer_id) {
    res.status(400).json({ error: 'no_subscription' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);
  try {
    // planKey指定時は、プラン変更確認画面へ直接遷移するflow_dataを組み立てる。
    // (クライアント側で登録人数の上限チェックを済ませた後に呼ばれる想定だが、
    // クライアントの改変によりそのチェックを回避されるおそれがあるため、
    // 実際にStripeへ変更を反映する前にサーバー側でも必ず検証する。)
    let flowData: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined;
    if (planKey) {
      const tier = planTiers.find((t) => t.key === planKey);
      const priceId = interval === 'year' ? tier?.annualStripePriceId : tier?.stripePriceId;
      const subscriptionId = config.stripe_subscription_id as string | null | undefined;
      if (!tier || !priceId || !subscriptionId) {
        res.status(400).json({ error: 'invalid_request' });
        return;
      }
      const { count: residentCount, error: residentCountError } = await admin
        .from('residents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .is('deleted_at', null);
      if (residentCountError) {
        res.status(500).json({ error: 'db_error', detail: residentCountError.message });
        return;
      }
      if ((residentCount ?? 0) > tier.maxResidents) {
        res.status(429).json({ error: 'resident_limit_exceeded' });
        return;
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const item = subscription.items.data[0];
      if (!item) {
        res.status(400).json({ error: 'no_subscription' });
        return;
      }
      flowData = {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: subscriptionId,
          items: [{ id: item.id, price: priceId, quantity: 1 }],
        },
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: config.stripe_customer_id as string,
      return_url: origin,
      ...(flowData ? { flow_data: flowData } : {}),
    });
    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: 'stripe_error', detail: e instanceof Error ? e.message : String(e) });
  }
}
