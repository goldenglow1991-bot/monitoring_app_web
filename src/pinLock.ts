// Anthropic APIキーの設定・利用(ドラフト生成)を守るための簡易PIN。
// この端末のブラウザ内に保存されるだけの、カジュアルな誤操作・覗き見を防ぐ
// ための仕組みで、開発者ツール等を使う本格的な攻撃までは防げない。
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
