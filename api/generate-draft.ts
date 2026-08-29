import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { MODEL_NAME } from '../src/items.js';

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
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!supabaseUrl || !supabaseKey || !anthropicApiKey) {
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const { userPrompt, systemPrompt } = (req.body ?? {}) as {
    userPrompt?: string;
    systemPrompt?: string;
  };
  if (!userPrompt || !systemPrompt) {
    res.status(400).json({ error: 'invalid_request' });
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
  res.status(200).json({ text });
}
