export class AnthropicError extends Error {}
// 無料枠(生成10回)を使い切り、プランへの加入が必要な状態。
export class QuotaExceededError extends Error {}
// 登録人数が、現在のプラン(または無料枠)の上限人数を超えている状態。
export class ResidentLimitExceededError extends Error {}
// 今月のAI生成回数が、加入中プランの月間上限(予防的な上限)に達した状態。
export class MonthlyLimitExceededError extends Error {}

// AI下書き生成は、共有のAnthropic APIキーを保持するサーバー側エンドポイント
// (api/generate-draft)経由で呼び出す。共有キーはブラウザには一切渡さず、
// 代わりにこのユーザーのSupabaseアクセストークンで本人確認を行う。
export async function generateDraft(params: {
  accessToken: string;
  userPrompt: string;
  systemPrompt: string;
}): Promise<string> {
  let resp: Response;
  try {
    resp = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        userPrompt: params.userPrompt,
        systemPrompt: params.systemPrompt,
      }),
    });
  } catch (e) {
    throw new AnthropicError(`通信に失敗しました: ${e}`);
  }

  if (!resp.ok) {
    let detail = await resp.text();
    try {
      const decoded = JSON.parse(detail);
      if (decoded?.error === 'quota_exceeded') {
        throw new QuotaExceededError();
      }
      if (decoded?.error === 'resident_limit_exceeded') {
        throw new ResidentLimitExceededError();
      }
      if (decoded?.error === 'monthly_limit_exceeded') {
        throw new MonthlyLimitExceededError();
      }
      if (decoded?.detail) {
        detail = decoded.detail;
      }
    } catch (e) {
      if (e instanceof QuotaExceededError || e instanceof ResidentLimitExceededError || e instanceof MonthlyLimitExceededError) throw e;
      // レスポンスがJSONでない場合は本文をそのまま使う
    }
    throw new AnthropicError(`APIエラー(${resp.status}): ${detail}`);
  }

  const decoded = await resp.json();
  return (decoded.text as string | undefined) ?? '';
}
