import { useState } from 'react';
import { supabase } from './supabaseClient';
import { facilityTypePresets } from './items';
import { planTiers } from './stripePrices';
import { showTermsDialog, showPrivacyDialog } from './dialogs';
import { termsVersion } from './termsContent';
import { privacyVersion } from './privacyContent';

type Mode = 'login' | 'signup' | 'forgot';

// Supabase Authのエラーメッセージ(英語)を日本語に置き換える。
// 未知のメッセージはそのまま表示する(想定外のエラーでも情報が消えないように)。
function translateAuthError(message: string): string {
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

export function AuthPage({
  initialMode = 'login',
  onBack,
}: {
  initialMode?: 'login' | 'signup';
  onBack?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [facilityType, setFacilityType] = useState('');
  const [expectedResidentCount, setExpectedResidentCount] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setErrorText(null);
    setInfoText(null);
    setResetSentTo(null);
  }

  async function submit() {
    setErrorText(null);
    setInfoText(null);
    if (email.trim() === '' || password === '') {
      setErrorText('メールアドレスとパスワードを入力してください。');
      return;
    }
    if (mode === 'signup' && !/^[A-Za-z0-9]{8,}$/.test(password)) {
      setErrorText('パスワードは8文字以上の半角英数字で入力してください。');
      return;
    }
    if (mode === 'signup' && !agreedToTerms) {
      setErrorText('利用規約への同意が必要です。');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setErrorText(translateAuthError(error.message));
      } else {
        const metadata: Record<string, string> = {
          terms_agreed_at: new Date().toISOString(),
          terms_version: termsVersion,
          privacy_version: privacyVersion,
        };
        if (facilityType) metadata.facility_type = facilityType;
        const parsedCount = parseInt(expectedResidentCount, 10);
        if (expectedResidentCount.trim() !== '' && Number.isFinite(parsedCount) && parsedCount > 0) {
          metadata.expected_resident_count = String(parsedCount);
        }
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: metadata },
        });
        if (error) {
          setErrorText(translateAuthError(error.message));
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
          // メール確認が有効な場合、既に登録済みのメールアドレスでも
          // エラーにはならず(メール総当たり対策)、identitiesが空で返る。
          setErrorText('このメールアドレスは既に登録されています。ログインするか、パスワードをお忘れの場合は再設定してください。');
        } else if (!data.session) {
          // メール確認が有効な場合、ここではまだセッションが発行されない。
          setInfoText('確認メールを送信しました。メール内のリンクを開いて登録を完了してください。');
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendResetEmail() {
    setErrorText(null);
    if (email.trim() === '') {
      setErrorText('メールアドレスを入力してください。');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) {
        setErrorText(translateAuthError(error.message));
      } else {
        setResetSentTo(email.trim());
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="start-page">
      {onBack && (
        <button type="button" className="icon-btn start-back-btn" onClick={onBack} aria-label="トップに戻る">
          ←
        </button>
      )}
      <div className="start-page-inner">
        <div className="start-title">assist</div>
        <div className="start-subtitle">モニタリング作成支援アプリ</div>

        <div className="auth-card">
          {mode === 'forgot' ? (
            resetSentTo ? (
              <>
                <div className="auth-forgot-header">パスワードの再設定</div>
                <p className="hint-muted">
                  {resetSentTo} 宛にパスワード再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。
                </p>
                <button type="button" className="inline-link" onClick={() => switchMode('login')}>ログインへ戻る</button>
              </>
            ) : (
              <>
                <div className="auth-forgot-header">パスワードの再設定</div>
                <form onSubmit={(e) => { e.preventDefault(); sendResetEmail(); }}>
                  <div className="field">
                    <label>メールアドレス</label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {errorText && <p className="hint-error">{errorText}</p>}

                  <button type="submit" className="btn btn-filled auth-submit" disabled={busy}>
                    {busy ? '送信中...' : '再設定メールを送信'}
                  </button>
                </form>
                <button type="button" className="inline-link auth-forgot-back" onClick={() => switchMode('login')}>ログインへ戻る</button>
              </>
            )
          ) : (
            <>
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab${mode === 'login' ? ' auth-tab-active' : ''}`}
                  onClick={() => switchMode('login')}
                >
                  ログイン
                </button>
                <button
                  type="button"
                  className={`auth-tab${mode === 'signup' ? ' auth-tab-active' : ''}`}
                  onClick={() => switchMode('signup')}
                >
                  新規登録
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <div className="field">
                  <label>メールアドレス</label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>パスワード</label>
                  <input
                    type="password"
                    name="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {mode === 'signup' && <p className="hint-muted">8文字以上の半角英数字で入力してください</p>}
                </div>

                {mode === 'login' && (
                  <button type="button" className="inline-link auth-forgot-link" onClick={() => switchMode('forgot')}>
                    パスワードをお忘れですか?
                  </button>
                )}

                {mode === 'signup' && (
                  <div className="field">
                    <label>施設種別(あとから変更できます)</label>
                    <select
                      value={facilityType}
                      onChange={(e) => setFacilityType(e.target.value)}
                    >
                      <option value="">選択しない(標準の項目で始める)</option>
                      {facilityTypePresets.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="field">
                    <label>登録予定利用者数(任意)</label>
                    <select
                      value={expectedResidentCount}
                      onChange={(e) => setExpectedResidentCount(e.target.value)}
                    >
                      <option value="">選択しない</option>
                      {planTiers.map((t) => (
                        <option key={t.key} value={String(t.maxResidents)}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {mode === 'signup' && (
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    <span>
                      <button type="button" className="inline-link" onClick={() => showTermsDialog()}>利用規約</button>
                      と
                      <button type="button" className="inline-link" onClick={() => showPrivacyDialog()}>プライバシーポリシー</button>
                      に同意する
                    </span>
                  </label>
                )}

                {errorText && <p className="hint-error">{errorText}</p>}
                {infoText && <p className="hint-muted">{infoText}</p>}

                <button type="submit" className="btn btn-filled auth-submit" disabled={busy}>
                  {busy ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
