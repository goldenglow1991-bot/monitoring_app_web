import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { MODEL_NAME } from '../src/items.js';
import { freeGenerationLimit } from '../src/stripePrices.js';
import { currentYearMonth } from '../src/utils.js';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

// AI下書き生成のサーバー側エンドポイント。共有のAnthropic APIキー
// (ANTHROPIC_API_KEY、Vercelの環境変数)はここにしか存在させず、
// ブラウザには一切渡さない。呼び出し元はSupabaseのアクセストークンで
// 本人確認する(ログイン済みでなければ拒否する)。
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
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!supabaseUrl || !supabaseKey || !serviceRoleKey || !anthropicApiKey) {
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

  const { userPrompt, systemPrompt } = (req.body ?? {}) as {
    userPrompt?: string;
    systemPrompt?: string;
  };
  if (!userPrompt || !systemPrompt) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  // 無料枠(10回)の判定。有効なサブスクがあれば無制限、なければ生涯累計10回まで。
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: config, error: configError } = await admin
    .from('facility_config')
    .select('free_generations_used, subscription_status')
    .eq('user_id', uid)
    .maybeSingle();
  if (configError) {
    res.status(500).json({ error: 'db_error', detail: configError.message });
    return;
  }
  const hasActiveSubscription = !!config?.subscription_status && ACTIVE_STATUSES.has(config.subscription_status);
  const freeUsed = (config?.free_generations_used as number | undefined) ?? 0;
  if (!hasActiveSubscription && freeUsed >= freeGenerationLimit) {
    res.status(429).json({ error: 'quota_exceeded' });
    return;
  }

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_tokens: 2048,
        system: systemPrompt,
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch (e) {
    res.status(502).json({ error: 'upstream_request_failed', detail: String(e) });
    return;
  }

  if (!anthropicRes.ok) {
    const rawDetail = await anthropicRes.text();
    let detail = rawDetail;
    try {
      const decoded = JSON.parse(rawDetail);
      if (decoded?.error?.message) detail = decoded.error.message;
    } catch {
      // レスポンスがJSONでない場合は本文をそのまま使う
    }
    res.status(anthropicRes.status).json({ error: 'anthropic_error', detail });
    return;
  }

  const decoded = (await anthropicRes.json()) as { content?: Array<{ type: string; text?: string }> };
  const content = decoded.content ?? [];
  let text = '';
  for (const block of content) {
    if (block.type === 'text') text += block.text ?? '';
  }

  // 生成に成功した分だけ、利用回数を記録する。
  if (!hasActiveSubscription) {
    await admin
      .from('facility_config')
      .upsert({ user_id: uid, free_generations_used: freeUsed + 1 });
  }
  const yearMonth = currentYearMonth();
  const { data: usageRow } = await admin
    .from('ai_usage')
    .select('count')
    .eq('user_id', uid)
    .eq('year_month', yearMonth)
    .maybeSingle();
  await admin
    .from('ai_usage')
    .upsert({ user_id: uid, year_month: yearMonth, count: ((usageRow?.count as number | undefined) ?? 0) + 1 });

  res.status(200).json({ text });
}
