import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { StartPage } from './StartPage';
import { HomePage } from './HomePage';
import { AuthPage } from './AuthPage';
import { LandingPage } from './LandingPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { DialogHost, closeAllDialogs } from './dialogHost';
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
  const [showAuth, setShowAuth] = useState(
    () => new URLSearchParams(window.location.search).get('screen') === 'auth',
  );
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');

  // 1時間操作がないと自動的にログアウトする(共有端末での放置対策)。
  // ホーム画面限定の「10分で保存してスタート画面に戻る」機能とは別に、
  // ログイン中は画面によらず常に働く、より長いタイムアウト。
  useEffect(() => {
    if (!session) return;
    const AUTO_LOGOUT_MS = 60 * 60 * 1000;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let backgroundedAt: number | null = null;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        supabase.auth.signOut();
      }, AUTO_LOGOUT_MS);
    };
    resetIdleTimer();

    const onActivity = () => resetIdleTimer();
    document.addEventListener('pointerdown', onActivity);

    // バックグラウンドの間はタイマーが止まっている可能性があるため、
    // 復帰時に1時間以上経っていればまとめてログアウト扱いにする。
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (idleTimer) clearTimeout(idleTimer);
        backgroundedAt = Date.now();
      } else {
        const at = backgroundedAt;
        backgroundedAt = null;
        if (at != null && Date.now() - at >= AUTO_LOGOUT_MS) {
          supabase.auth.signOut();
        } else {
          resetIdleTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
      if (idleTimer) clearTimeout(idleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // LP⇔ログイン画面の行き来をブラウザの履歴に積む。「戻る」ボタンで
  // LPに戻れるようにするため、URLの変更(popstate)に合わせて画面を切り替える。
  useEffect(() => {
    const onPopState = () => {
      setShowAuth(new URLSearchParams(window.location.search).get('screen') === 'auth');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function goToAuth(mode: 'login' | 'signup') {
    setAuthInitialMode(mode);
    setShowAuth(true);
    window.history.pushState({}, '', '/?screen=auth');
  }

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
          // ログアウト・別ユーザーへの切り替え時、開きっぱなしのダイアログが
          // 前のユーザーのデータのまま次のユーザーに表示され続けるのを防ぐ。
          closeAllDialogs();
        }
        return newSession;
      });
      if (!newSession) {
        setPage('start');
        setShowAuth(false);
        window.history.replaceState({}, '', '/');
      } else {
        // ログイン成功後はURLからscreen=authを消しておく(履歴には残さない)。
        window.history.replaceState({}, '', '/');
      }
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

      // Stripe Checkoutから戻ってきた直後は、Webhookの反映に多少
      // タイムラグがあるため、少し待ってから最新のプラン情報を取り直す。
      // (この判定はStartPage/HomePageどちらが表示されるかに関わらず、
      // ログイン直後に必ず一度だけ通るここで行う必要がある。)
      const checkoutResult = new URLSearchParams(window.location.search).get('checkout');
      if (checkoutResult) {
        window.history.replaceState({}, '', window.location.pathname);
        if (checkoutResult === 'success') {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await storage.loadAll();
        }
      }

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
        {showAuth ? (
          <AuthPage initialMode={authInitialMode} onBack={() => window.history.back()} />
        ) : (
          <LandingPage
            onGetStarted={() => goToAuth('signup')}
            onLogin={() => goToAuth('login')}
          />
        )}
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
