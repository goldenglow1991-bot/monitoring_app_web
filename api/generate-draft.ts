import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { MODEL_NAME } from '../src/items.js';
import { freeGenerationLimit, planTiers } from '../src/stripePrices.js';
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

  // 有効なサブスクがあれば無制限、なければ生涯累計10回までの無料枠。
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: config, error: configError } = await admin
    .from('facility_config')
    .select('subscription_status, subscription_plan')
    .eq('user_id', uid)
    .maybeSingle();
  if (configError) {
    res.status(500).json({ error: 'db_error', detail: configError.message });
    return;
  }
  const hasActiveSubscription = !!config?.subscription_status && ACTIVE_STATUSES.has(config.subscription_status);

  // 登録人数が、現在のプラン(未加入の場合は最小プラン)の上限を超えていないか確認する。
  // クライアント側の追加時チェックだけでは、加入後に大人数を登録してから
  // 下位プランへダウングレードする、あるいはクライアントの改変により
  // 上限チェックを回避されるおそれがあるため、課金機能の実行口である
  // ここ(サーバー側)でも必ず検証する。
  const currentTier = hasActiveSubscription
    ? planTiers.find((t) => t.key === config?.subscription_plan)
    : undefined;
  const residentCap = currentTier?.maxResidents ?? planTiers[0].maxResidents;
  const { count: residentCount, error: residentCountError } = await admin
    .from('residents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .is('deleted_at', null);
  if (residentCountError) {
    res.status(500).json({ error: 'db_error', detail: residentCountError.message });
    return;
  }
  if ((residentCount ?? 0) > residentCap) {
    res.status(429).json({ error: 'resident_limit_exceeded' });
    return;
  }

  // 無料枠・月間上限のチェックとカウント更新をAI呼び出し前にアトミックに行う
  // (reserve_*関数はUPDATE ... WHERE count < 上限を1文で行うため、同時リクエストが
  // 来てもPostgresの行ロックにより直列化され、両方が同じ古いカウントで上限
  // チェックを通過してしまう競合状態が起きない)。AI呼び出しが失敗した場合は
  // release_*で確保した分を1つ戻す。
  const yearMonth = currentYearMonth();
  let reservedFree = false;
  let reservedMonthly = false;

  async function releaseReservations() {
    if (reservedFree) await admin.rpc('release_free_generation', { p_user_id: uid });
    if (reservedMonthly) await admin.rpc('release_monthly_usage', { p_user_id: uid, p_year_month: yearMonth });
  }

  if (!hasActiveSubscription) {
    const { data: ok, error: reserveError } = await admin.rpc('reserve_free_generation', {
      p_user_id: uid,
      p_limit: freeGenerationLimit,
    });
    if (reserveError) {
      res.status(500).json({ error: 'db_error', detail: reserveError.message });
      return;
    }
    if (!ok) {
      res.status(429).json({ error: 'quota_exceeded' });
      return;
    }
    reservedFree = true;

    // ai_usageは無料ユーザーについては表示専用(上限チェックには使わない)。
    const { error: displayError } = await admin.rpc('reserve_monthly_usage', {
      p_user_id: uid,
      p_year_month: yearMonth,
      p_cap: null,
    });
    if (displayError) {
      await releaseReservations();
      res.status(500).json({ error: 'db_error', detail: displayError.message });
      return;
    }
    reservedMonthly = true;
  } else {
    // 有料プランでも、月間の生成回数に予防的な上限(プランの上限人数の3倍)を
    // 設ける。1人あたり月1回の生成が基本のため、作り直し等を考慮しても
    // 通常の利用では十分な余裕があり、暴走的な利用(API費用の急増等)を
    // 防ぐためのものであって、通常の利用を制限する意図ではない。
    const monthlyCap = currentTier ? currentTier.maxResidents * 3 : null;
    const { data: ok, error: reserveError } = await admin.rpc('reserve_monthly_usage', {
      p_user_id: uid,
      p_year_month: yearMonth,
      p_cap: monthlyCap,
    });
    if (reserveError) {
      res.status(500).json({ error: 'db_error', detail: reserveError.message });
      return;
    }
    if (!ok) {
      res.status(429).json({ error: 'monthly_limit_exceeded' });
      return;
    }
    reservedMonthly = true;
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
    await releaseReservations();
    res.status(502).json({ error: 'upstream_request_failed', detail: String(e) });
    return;
  }

  if (!anthropicRes.ok) {
    await releaseReservations();
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

  res.status(200).json({ text });
}
