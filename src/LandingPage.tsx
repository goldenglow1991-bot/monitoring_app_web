import { showTokushohoDialog, showContactDialog } from './dialogs';
import { planTiers, freeGenerationLimit, annualDiscountRate, annualPriceFor } from './stripePrices';

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
        <a
          href="#"
          className="lp-logo"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          <div className="lp-logo-brand">
            <div className="lp-logo-yomi">アシスト</div>
            <div className="lp-logo-main">Assist</div>
          </div>
        </a>
        <div className="lp-header-actions">
          <button type="button" className="btn btn-text" onClick={onLogin}>ログイン</button>
          <button type="button" className="btn btn-filled" onClick={onGetStarted}>無料で試してみる</button>
        </div>
      </div>

      <div className="lp-section lp-hero">
        <div className="lp-wrap">
          <div className="lp-eyebrow">介護現場向け<br />かんたんモニタリング作成AI</div>
          <h1 className="lp-hero-title">
            モニタリング作成に、<br />もう時間をかけない。
          </h1>
          <p className="lp-hero-lead">
            選んだ所見から、AIが自然な文章を数秒で作成。
            <br />
            簡単な操作で、書類仕事の負担を減らし、本来のケアに向き合う時間を取り戻します。
            <br />
            スマホからでも、すきま時間にサッと入力できます。
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
            シフトを終えたあとにまとめて書く記録作成。
            <br />
            毎月の言葉選びの負担、書き忘れへの不安。
            <br />
            介護の現場では、ケアそのものより記録の時間に追われてしまうことが少なくありません。
          </p>
          <div className="lp-before-after">
            <div className="lp-before-after-item">
              <img src="/images/lp/pain-point.jpg" alt="記録に追われて疲れている介護スタッフ" className="lp-photo" />
              <div className="lp-photo-caption">記録に追われる毎日…</div>
            </div>
            <div className="lp-before-after-arrow">→</div>
            <div className="lp-before-after-item">
              <img src="/images/lp/solved.jpg" alt="Assistでスムーズに記録を終えて喜ぶ介護スタッフ" className="lp-photo" />
              <div className="lp-photo-caption">Assistでスムーズに完了</div>
            </div>
          </div>
          <p className="lp-empathy-bridge">その負担を、Assistが一緒に軽くします。</p>
          <div className="lp-testimonial">
            <p className="lp-testimonial-quote">「1人あたり15〜20分かかっていた記録が、5分もかからずにできるようになりました。」</p>
            <p className="lp-testimonial-quote">「所見を見ながらの記入なので、利用者さんの様子も思い出しやすいです。」</p>
            <p className="lp-testimonial-quote">「スマホからでも入力できて便利。見た目もシンプルで使いやすいです」</p>
            <div className="lp-testimonial-source">実際に試験導入したデイサービス職員の声</div>
          </div>
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
          <div className="lp-eyebrow">Assistでできること</div>
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
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
            </div>
            <div>
              <h3>事業所ごとに項目や言葉遣いを調整</h3>
              <p>施設の種別に合わせて項目をカスタマイズでき、文章の口調も選べます。</p>
            </div>
          </div>
          <div className="lp-feature-row">
            <div className="lp-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
            </div>
            <div>
              <h3>スマホからでも、いつでもどこでも入力</h3>
              <p>
                パソコンだけでなくスマホからも同じようにログイン・入力できます。
                <br />
                訪問の合間や休憩中など、ちょっとしたすきま時間にサッと記録を済ませられます。
              </p>
            </div>
          </div>
        </div>
        <div className="lp-emotion-photo-row">
          <img src="/images/lp/time-with-resident.jpg" alt="浮いた時間で利用者と笑顔で向き合う介護スタッフ" />
          <div className="lp-emotion-text">
            <h3>浮いた時間を、利用者との時間に。</h3>
            <p>記録に追われる時間が減れば、そのぶん利用者さんとゆっくり向き合う時間が増えます。</p>
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

      <div className="lp-section">
        <div className="lp-wrap lp-center" style={{ marginBottom: 56 }}>
          <div className="lp-eyebrow">安心してお使いいただけます</div>
          <h2>大切な記録を、安全に</h2>
        </div>
        <div className="lp-wrap lp-features">
          <div className="lp-feature-row">
            <div className="lp-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <div>
              <h3>通信・データはすべて暗号化</h3>
              <p>ご利用者様の情報は暗号化された通信で送受信され、他の事業所のデータを見ることは一切できません。</p>
            </div>
          </div>
          <div className="lp-feature-row">
            <div className="lp-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
            </div>
            <div>
              <h3>AIに氏名は送信されません</h3>
              <p>文章生成の際、ご利用者様の氏名はAIに送られません(留意点・自由記入欄に記載した場合を除く)。</p>
            </div>
          </div>
          <div className="lp-feature-row">
            <div className="lp-feature-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00796b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
            </div>
            <div>
              <h3>決済情報は当方で保持しません</h3>
              <p>お支払い情報は決済代行会社(Stripe)が管理し、カード番号等が当方のサーバーに保存されることはありません。</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-section lp-panel" id="pricing">
        <div className="lp-wrap lp-center" style={{ marginBottom: 40 }}>
          <div className="lp-eyebrow">料金プラン</div>
          <h2>まずは10回、無料でお試しを</h2>
          <p className="lp-lead">
            {freeGenerationLimit}回目までは無料でご利用いただけます。
            <br />
            それ以降は、登録人数に応じたプランへのお申し込みが必要です。
            <br />
            年払いなら、月払いの{Math.round(annualDiscountRate * 100)}%オフでご利用いただけます。
          </p>
        </div>
        <div className="lp-wrap lp-pricing-grid">
          {planTiers.map((tier) => (
            <div className="lp-pricing-card" key={tier.key}>
              <div className="lp-pricing-tier">{tier.label}</div>
              <div className="lp-pricing-price">
                {tier.priceYen.toLocaleString()}<span>円/月</span>
              </div>
              <div className="lp-pricing-annual">年払い {annualPriceFor(tier).toLocaleString()}円/年</div>
            </div>
          ))}
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
              はじめの{freeGenerationLimit}回は無料でお試しいただけます。
              <br />
              それ以降は月額{planTiers[0].priceYen.toLocaleString()}円〜、登録人数に応じたプランをご用意しています。
              <br />
              詳しくは<a href="#pricing" className="inline-link">料金プラン</a>をご覧ください。
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
        <div className="lp-footer-logo">Assist</div>
        <div>
          Golden Glow ｜{' '}
          <button type="button" className="inline-link" onClick={() => showContactDialog()}>
            お問い合わせ
          </button>
          : info@kaigoassist.jp
        </div>
        <button type="button" className="btn btn-text lp-footer-link" onClick={() => showTokushohoDialog()}>
          特定商取引法に基づく表記
        </button>
      </div>
    </div>
  );
}
