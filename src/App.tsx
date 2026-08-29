import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { StartPage } from './StartPage';
import { HomePage } from './HomePage';
import { AuthPage } from './AuthPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { DialogHost } from './dialogHost';
import { supabase } from './supabaseClient';
import * as storage from './storage';
import './App.css';

export default function App() {
  const [page, setPage] = useState<'start' | 'home'>('start');
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // データ読み込み中(ログイン確認後、画面を出す前に一度だけSupabaseから
  // 全データを取得する)かどうか。同じセッションの間は読み込み直さない。
  const [dataReady, setDataReady] = useState(false);
  const [loadErrorText, setLoadErrorText] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (_event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession((prev) => {
        // 同じユーザーのままトークンが更新されただけの場合は、データの
        // 再読み込みをしない(dataReadyを保つ)。
        if (prev?.user.id !== newSession?.user.id) {
          setDataReady(false);
          storage.clearCache();
        }
        return newSession;
      });
      if (!newSession) setPage('start');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || dataReady) return;
    let cancelled = false;
    setLoadErrorText(null);
    (async () => {
      try {
        await storage.applyInitialFacilityTypeFromSignup();
      } catch (e) {
        // 初回施設種別の適用に失敗しても、標準の項目でアプリ自体は使えるようにする。
        console.error('初回施設種別の適用に失敗しました', e);
      }
      await storage.loadAll();
      if (!cancelled) setDataReady(true);
    })().catch((e) => {
      if (!cancelled) setLoadErrorText(e instanceof Error ? e.message : String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [session, dataReady]);

  if (session === undefined) {
    // セッション確認中(初回のみ、一瞬)。
    return null;
  }

  if (session && passwordRecovery) {
    return (
      <>
        <ResetPasswordPage onDone={() => setPasswordRecovery(false)} />
        <DialogHost />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <AuthPage />
        <DialogHost />
      </>
    );
  }

  if (!dataReady) {
    return (
      <div className="start-page">
        <div className="start-page-inner">
          <div className="start-title">assist</div>
          {loadErrorText ? (
            <p className="hint-error">データの読み込みに失敗しました: {loadErrorText}</p>
          ) : (
            <p className="hint-muted">読み込み中...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {page === 'start' ? (
        <StartPage onStart={() => setPage('home')} />
      ) : (
        <HomePage key="home" onExit={() => setPage('start')} />
      )}
      <DialogHost />
    </>
  );
}
