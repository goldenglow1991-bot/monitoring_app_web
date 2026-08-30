import { supabase } from './supabaseClient';
import { showUsageGuideDialog } from './dialogs';

export function StartPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="start-page">
      <div className="start-page-inner">
        <div className="start-title">assist</div>
        <div className="start-subtitle">モニタリング作成支援アプリ</div>
        <button className="btn btn-filled start-button" onClick={onStart}>
          ▶ 入力を開始する
        </button>
        <div className="start-usage-link">
          <button className="inline-link" onClick={() => showUsageGuideDialog()}>使いかた</button>
        </div>
        <div>
          <button className="logout-link" onClick={() => supabase.auth.signOut()}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
