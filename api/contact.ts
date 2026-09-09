import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;
const PER_EMAIL_LIMIT = 3;
const PER_EMAIL_WINDOW_MS = 60 * 60 * 1000; // 1時間
const GLOBAL_LIMIT = 50;
const GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1000; // 1日

// LPの「お問い合わせ」フォームからの送信を受け、Resend経由でinfo@kaigoassist.jp
// 宛にメールを送るサーバー側エンドポイント。ログイン不要で誰でも呼べるため、
// honeypot・簡易なバリデーションに加え、contact_submissionsテーブルへの記録を
// 見てレート制限する(同一メールアドレスの連投と、全体の大量送信の両方を防ぐ)。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const { email, message, honeypot } = (req.body ?? {}) as {
    email?: string;
    message?: string;
    honeypot?: string;
  };

  // honeypot欄が埋まっていればbotとみなし、何もせず成功したふりをする。
  if (honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  if (!message || message.trim() === '' || message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: 'invalid_message' });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = Date.now();

  const { count: emailCount, error: emailCountError } = await admin
    .from('contact_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', new Date(now - PER_EMAIL_WINDOW_MS).toISOString());
  if (emailCountError) {
    res.status(500).json({ error: 'db_error', detail: emailCountError.message });
    return;
  }
  if ((emailCount ?? 0) >= PER_EMAIL_LIMIT) {
    res.status(429).json({ error: 'rate_limited_email' });
    return;
  }

  const { count: globalCount, error: globalCountError } = await admin
    .from('contact_submissions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(now - GLOBAL_WINDOW_MS).toISOString());
  if (globalCountError) {
    res.status(500).json({ error: 'db_error', detail: globalCountError.message });
    return;
  }
  if ((globalCount ?? 0) >= GLOBAL_LIMIT) {
    res.status(429).json({ error: 'rate_limited_global' });
    return;
  }

  const { error: insertError } = await admin.from('contact_submissions').insert({ email });
  if (insertError) {
    res.status(500).json({ error: 'db_error', detail: insertError.message });
    return;
  }

  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'assist <info@kaigoassist.jp>',
      to: ['info@kaigoassist.jp'],
      reply_to: email,
      subject: 'assistへのお問い合わせ',
      text: `${message}\n\n---\n返信先メールアドレス: ${email}`,
    }),
  });

  if (!resendResp.ok) {
    const detail = await resendResp.text().catch(() => '');
    console.error('Resendへの送信に失敗しました', resendResp.status, detail);
    res.status(502).json({ error: 'send_failed' });
    return;
  }

  res.status(200).json({ ok: true });
}
