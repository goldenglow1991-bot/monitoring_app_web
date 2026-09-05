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
  const email = userData.user.email ?? undefined;

  const { planKey, origin, interval } = (req.body ?? {}) as { planKey?: string; origin?: string; interval?: string };
  const tier = planTiers.find((t) => t.key === planKey);
  const priceId = interval === 'year' ? tier?.annualStripePriceId : tier?.stripePriceId;
  if (!tier || !priceId || !origin) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: config, error: configError } = await admin
    .from('facility_config')
    .select('stripe_customer_id')
    .eq('user_id', uid)
    .maybeSingle();
  if (configError) {
    res.status(500).json({ error: 'db_error', detail: configError.message });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    let customerId = config?.stripe_customer_id as string | null | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: uid } });
      customerId = customer.id;
      const { error: upsertError } = await admin
        .from('facility_config')
        .upsert({ user_id: uid, stripe_customer_id: customerId });
      if (upsertError) {
        res.status(500).json({ error: 'db_error', detail: upsertError.message });
        return;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      metadata: { supabase_user_id: uid, plan_key: tier.key },
      subscription_data: { metadata: { supabase_user_id: uid, plan_key: tier.key } },
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: 'stripe_error', detail: e instanceof Error ? e.message : String(e) });
  }
}
