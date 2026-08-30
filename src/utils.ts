import type { User } from './types.js';

export function currentYearMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

// ひらがなと(全角)カタカナはUnicode上0x60ずれた同じ並びを持つ。
// 長音記号「ー」や中点「・」などひらがなに対応がない文字はそのまま残す。
export function katakanaToHiragana(text: string): string {
  let result = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x30a1 && code <= 0x30f6) {
      result += String.fromCodePoint(code - 0x60);
    } else {
      result += ch;
    }
  }
  return result;
}

export function isHiraganaOnly(text: string): boolean {
  if (text.length === 0) return false;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x3041 || code > 0x3096) return false;
  }
  return true;
}

// ひらがなのUnicodeブロックは既に「あいうえお…わをん」の順に並んでいるため、
// フリガナ文字列をそのまま比較すれば五十音順になる。フリガナ未設定の利用者は
// 名前で代用する(漢字順は厳密ではないが、一箇所に固まるのを防ぐ)。
export function furiganaSortKey(user: User): string {
  return user.furigana.length > 0 ? user.furigana : user.name;
}

// Dartの String.compareTo と同じ(コードユニット単位の)並びにするため、
// ロケール依存のlocaleCompareではなく素の比較演算子を使う。
export function sortUsers(users: User[]): void {
  users.sort((a, b) => {
    const ka = furiganaSortKey(a);
    const kb = furiganaSortKey(b);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  });
}
