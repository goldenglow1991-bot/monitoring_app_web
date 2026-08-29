import { useState } from 'react';
import { supabase } from './supabaseClient';

// パスワード再設定メール内のリンクを開くと、SupabaseがPASSWORD_RECOVERY
// イベントとともに一時的なセッションを発行する。その状態でこの画面を出し、
// 新しいパスワードを入力してもらう。
export function ResetPasswordPage({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function submit() {
    setErrorText(null);
    if (password === '' || confirmPassword === '') {
      setErrorText('新しいパスワードを入力してください。');
      return;
    }
    if (password !== confirmPassword) {
      setErrorText('パスワードが一致しません。');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorText(error.message);
      } else {
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="start-page">
      <div className="start-page-inner">
        <div className="start-title">assist</div>
        <div className="start-subtitle">パスワードの再設定</div>

        <div className="auth-card">
          <div className="field">
            <label>新しいパスワード</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
          </div>
          <div className="field">
            <label>新しいパスワード(確認)</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
          </div>

          {errorText && <p className="hint-error">{errorText}</p>}

          <button className="btn btn-filled auth-submit" disabled={busy} onClick={submit}>
            {busy ? '処理中...' : 'パスワードを更新する'}
          </button>
        </div>
      </div>
    </div>
  );
}
