import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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

  const { origin } = (req.body ?? {}) as { origin?: string };
  if (!origin) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: config, error: configError } = await admin
    .from('facility_config')
    .select('stripe_customer_id')
    .eq('user_id', uid)
    .maybeSingle();
  if (configError || !config?.stripe_customer_id) {
    res.status(400).json({ error: 'no_subscription' });
    return;
  }

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.billingPortal.sessions.create({
    customer: config.stripe_customer_id as string,
    return_url: origin,
  });

  res.status(200).json({ url: session.url });
}
