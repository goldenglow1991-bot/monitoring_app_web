import type { User } from './types.js';

// Supabase Authのエラーメッセージ(英語)を日本語に置き換える。
// 未知のメッセージはそのまま表示する(想定外のエラーでも情報が消えないように)。
export function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }
  if (/email not confirmed/i.test(message)) {
    return 'メールアドレスの確認が完了していません。届いている確認メール内のリンクを開いてください。';
  }
  if (/already registered/i.test(message)) {
    return 'このメールアドレスは既に登録されています。ログインするか、パスワードをお忘れの場合は再設定してください。';
  }
  if (/password.*(least|should be at least)/i.test(message)) {
    return 'パスワードは6文字以上で入力してください。';
  }
  if (/unable to validate email address/i.test(message)) {
    return 'メールアドレスの形式が正しくありません。';
  }
  if (/for security purposes.*only request this/i.test(message)) {
    return 'しばらく時間をおいてから再度お試しください。';
  }
  return message;
}

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
