import { MODEL_NAME } from './items';

export class AnthropicError extends Error {}

// Anthropic APIはCORSに対応しており、
// `anthropic-dangerous-direct-browser-access: true` ヘッダーを付けることで
// ブラウザから直接呼び出せる。
export async function generateDraft(params: {
  apiKey: string;
  userPrompt: string;
  systemPrompt: string;
}): Promise<string> {
  let resp: Response;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': params.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_tokens: 2048,
        system: params.systemPrompt,
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: params.userPrompt }],
      }),
    });
  } catch (e) {
    throw new AnthropicError(`通信に失敗しました: ${e}`);
  }

  if (!resp.ok) {
    let detail = await resp.text();
    try {
      const decoded = JSON.parse(detail);
      if (decoded?.error?.message) {
        detail = decoded.error.message;
      }
    } catch {
      // レスポンスがJSONでない場合は本文をそのまま使う
    }
    throw new AnthropicError(`APIエラー(${resp.status}): ${detail}`);
  }

  const decoded = await resp.json();
  const content = (decoded.content as Array<{ type: string; text?: string }>) ?? [];
  let text = '';
  for (const block of content) {
    if (block.type === 'text') text += block.text ?? '';
  }
  return text;
}
