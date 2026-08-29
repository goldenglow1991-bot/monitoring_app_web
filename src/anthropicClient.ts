export class AnthropicError extends Error {}

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
      if (decoded?.detail) {
        detail = decoded.detail;
      }
    } catch {
      // レスポンスがJSONでない場合は本文をそのまま使う
    }
    throw new AnthropicError(`APIエラー(${resp.status}): ${detail}`);
  }

  const decoded = await resp.json();
  return (decoded.text as string | undefined) ?? '';
}
