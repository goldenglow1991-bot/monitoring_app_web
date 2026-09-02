import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { showUsageGuideDialog, showAccountDialog, showAnnouncementsDialog, hasUnreadAnnouncements } from './dialogs';

export function StartPage({ onStart }: { onStart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [hasUnread, setHasUnread] = useState(() => hasUnreadAnnouncements());

  async function openAnnouncements() {
    await showAnnouncementsDialog();
    setHasUnread(false);
  }

  // メニュー表示中に外側をタップ/クリックしたら閉じる。
  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [menuOpen]);

  return (
    <div className="start-page">
      <button
        type="button"
        className="start-announce-btn"
        aria-label="お知らせ"
        title="お知らせ"
        onClick={openAnnouncements}
      >
        🔔
        {hasUnread && <span className="start-announce-badge" />}
      </button>
      <div className="start-menu" ref={menuRef}>
        <button
          type="button"
          className="start-menu-btn"
          aria-label="メニュー"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
        <div className={`start-menu-dropdown${menuOpen ? ' start-menu-dropdown-open' : ''}`}>
          <button type="button" onClick={() => { setMenuOpen(false); showAccountDialog(); }}>アカウント</button>
          <button type="button" onClick={() => { setMenuOpen(false); showUsageGuideDialog(); }}>使いかた</button>
          <button type="button" onClick={() => { setMenuOpen(false); supabase.auth.signOut(); }}>ログアウト</button>
        </div>
      </div>
      <div className="start-page-inner">
        <div className="start-title">assist</div>
        <div className="start-subtitle">モニタリング作成支援アプリ</div>
        <button className="btn btn-filled start-button" onClick={onStart}>
          ▶ 入力を開始する
        </button>
      </div>
    </div>
  );
}
