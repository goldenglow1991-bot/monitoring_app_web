import { showTokushohoDialog } from './dialogs';

export function LandingPage({
  onGetStarted,
  onLogin,
}: {
  onGetStarted: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="lp">
      <div className="lp-header">
        <div className="lp-logo">assist</div>
        <div className="lp-header-actions">
          <button type="button" className="btn btn-text" onClick={onLogin}>ログイン</button>
          <button type="button" className="btn btn-filled" onClick={onGetStarted}>無料で試してみる</button>
        </div>
      </div>

      <div className="lp-section lp-hero">
        <div className="lp-wrap">
          <div className="lp-eyebrow">訪問介護・デイサービスをはじめとした介護現場向け モニタリング作成支援</div>
          <h1 className="lp-hero-title">
            モニタリング作成に、<br />もう時間をかけない。
          </h1>
          <p className="lp-hero-lead">
            選んだ所見から、AIが自然な文章の下書きを数秒で作成。
            <br />
            書類仕事の時間を減らし、本来のケアに向き合う時間を取り戻します。
            <br />
            スマホからでも、訪問先や休憩中のすきま時間にサッと入力できます。
          </p>
          <div className="lp-hero-actions">
            <button type="button" className="btn btn-filled" onClick={onGetStarted}>無料で試してみる</button>
            <a href="#faq" className="btn btn-outlined">よくあるご質問を見る</a>
          </div>
          <div className="lp-hero-note">はじめの10回の文章生成は無料でお試しいただけます</div>
        </div>
      </div>

      <div className="lp-section lp-panel">
        <div className="lp-wrap lp-center">
          <div className="lp-eyebrow">こんなお悩みはありませんか</div>
          <h2>「今月の記録、まだ書けていない…」</h2>
          <p className="lp-lead">
            訪問先を回った後や、シフトを終えたあとにまとめて書く記録作成。
            <br />
            毎月の言葉選びの負担、書き忘れへの不安。
            <br />
            介護の現場では、ケアそのものより記録の時間に追われてしまうことが少なくありません。
          </p>
          <p className="lp-empathy-bridge">その負担を、assistが一緒に軽くします。</p>
        </div>
      </div>

      <div className="lp-section">
        <div className="lp-wrap lp-center" style={{ marginBottom: 56 }}>
          <div className="lp-eyebrow">むずかしい操作は、ひとつもありません</div>
          <h2>使い方は、たった3ステップ</h2>
        </div>
        <div className="lp-wrap lp-steps">
          <div className="lp-step">
            <div className="lp-step-label">STEP 1</div>
            <div className="lp-step-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            </div>
            <div className="lp-step-title">所見をタップして選ぶ</div>
            <div className="lp-step-desc">いつもの所見をプルダウンで選ぶだけ</div>
          </div>
          <div className="lp-step">
            <div className="lp-step-label">STEP 2</div>
            <div className="lp-step-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4" /><path d="m16.24 7.76 2.83-2.83" /><path d="M18 12h4" /><path d="m16.24 16.24 2.83 2.83" /><path d="M12 18v4" /><path d="m4.93 19.07 2.83-2.83" /><path d="M2 12h4" /><path d="m4.93 4.93 2.83 2.83" /></svg>
            </div>
            <div className="lp-step-title">AIが下書きを作成</div>
            <div className="lp-step-desc">自然な文章が数秒で出来上がる</div>
          </div>
          <div className="lp-step">
            <div className="lp-step-label">STEP 3</div>
            <div className="lp-step-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <div className="lp-step-title">確認して保存</div>
            <div className="lp-step-desc">内容を確かめて整えるだけで完了</div>
          </div>
        </div>
      </div>

      <div className="lp-section">
        <div className="lp-wrap lp-center" style={{ marginBottom: 64 }}>
          <div className="lp-eyebrow">assistでできること</div>
          <h2>記録の負担を、そのぶんケアの時間に</h2>
        </div>
        <div className="lp-wrap lp-features">
          <div className="lp-feature-row">
            <div className="lp-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </div>
            <div>
              <h3>項目を選ぶだけで、下書きが完成</h3>
              <p>
                歩行・食事・バイタルなど、いつもの項目にプルダウンで選択するだけ。
                <br />
                文章はAIが自然な言い回しで下書きにまとめます。
                <br />
                あとは確認して整えるだけです。
              </p>
            </div>
          </div>
          <div className="lp-feature-row">
            <div className="lp-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
            </div>
            <div>
              <h3>利用者ごとの記録を一元管理</h3>
              <p>
                過去の記録も月ごとに一覧で確認でき、書き忘れや記載漏れにも気づきやすくなります。
                <br />
                留意点もあわせて残せます。
              </p>
            </div>
          </div>
          <div className="lp-feature-row">
            <div className="lp-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
            </div>
            <div>
              <h3>事業所ごとに項目や言葉遣いを調整</h3>
              <p>
                施設の種別に合わせて項目をカスタマイズでき、文章の口調も選べます。
                <br />
                通信は暗号化され、事業所ごとにデータを分けて管理しています。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-section lp-panel">
        <div className="lp-wrap lp-center" style={{ marginBottom: 48 }}>
          <div className="lp-eyebrow">実際の画面</div>
          <h2>迷わず使える、シンプルな画面</h2>
        </div>
        <div className="lp-screenshot-mock">
          <div className="lp-screenshot-bar">
            <span /><span /><span />
          </div>
          <div className="lp-screenshot-body">
            <div className="lp-screenshot-side">
              <div className="lp-sk lp-sk-label" />
              <div className="lp-sk lp-sk-item lp-sk-active" />
              <div className="lp-sk lp-sk-item" />
              <div className="lp-sk lp-sk-item" />
            </div>
            <div className="lp-screenshot-main">
              <div className="lp-sk lp-sk-label" style={{ width: '40%' }} />
              <div className="lp-sk lp-sk-field" />
              <div className="lp-sk lp-sk-field" />
              <div className="lp-sk lp-sk-field" />
              <div className="lp-sk lp-sk-block" />
            </div>
          </div>
        </div>
      </div>

      <div className="lp-section" id="faq">
        <div className="lp-wrap lp-center" style={{ marginBottom: 48 }}>
          <div className="lp-eyebrow">よくあるご質問</div>
          <h2>はじめる前に、よくいただく質問</h2>
        </div>
        <div className="lp-wrap lp-faq">
          <div className="lp-faq-item">
            <div className="lp-faq-q">パソコンやITが苦手でも使えますか?</div>
            <div className="lp-faq-a">
              はい。
              <br />
              プルダウンで項目を選んでいくだけの画面なので、普段パソコンをあまり使わない方でも操作いただけます。
            </div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">個人でも利用できますか?</div>
            <div className="lp-faq-a">
              はい。
              <br />
              事業所単位はもちろん、個人でご利用いただくことも可能です。
              <br />
              ただし、業務で記録対象者の情報を入力する場合は、あらかじめ所属先の管理者等の許可を得たうえでご利用ください。
            </div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">料金はいくらですか?</div>
            <div className="lp-faq-a">
              ご利用人数に応じたプランをご用意しています。
              <br />
              詳しくはお問い合わせください。
            </div>
          </div>
          <div className="lp-faq-item">
            <div className="lp-faq-q">記録データの安全性は大丈夫ですか?</div>
            <div className="lp-faq-a">通信はすべて暗号化され、事業所ごとにデータへのアクセスを分離しています。</div>
          </div>
        </div>
      </div>

      <div className="lp-section lp-cta">
        <div className="lp-wrap lp-center">
          <h2>まずは無料でお試しください</h2>
          <p>
            はじめの10回の文章生成は無料です。
            <br />
            導入のご相談も承っています。
          </p>
          <button type="button" className="btn lp-cta-btn" onClick={onGetStarted}>無料で試してみる</button>
        </div>
      </div>

      <div className="lp-footer">
        <div className="lp-footer-logo">assist</div>
        <div>Golden Glow ｜ お問い合わせ: info@kaigoassist.jp</div>
        <button type="button" className="btn btn-text lp-footer-link" onClick={() => showTokushohoDialog()}>
          特定商取引法に基づく表記
        </button>
      </div>
    </div>
  );
}
