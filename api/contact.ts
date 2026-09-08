import type { VercelRequest, VercelResponse } from '@vercel/node';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;

// LPの「お問い合わせ」フォームからの送信を受け、Resend経由でinfo@kaigoassist.jp
// 宛にメールを送るサーバー側エンドポイント。ログイン不要で誰でも呼べるため、
// honeypotと簡易なバリデーションのみでスパム対策する。
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
  if (!resendApiKey) {
    res.status(500).json({ error: 'server_misconfigured' });
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
    // 原因調査のため一時的にdetailを返している。原因判明後は削除すること。
    res.status(502).json({ error: 'send_failed', status: resendResp.status, detail });
    return;
  }

  res.status(200).json({ ok: true });
}
