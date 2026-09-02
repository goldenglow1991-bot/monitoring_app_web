import { useEffect, useState, type ReactNode } from 'react';
import { openDialog, ModalShell } from './dialogHost';
import { itemCategories, itemCatalog, tonePresets, facilityTypePresets } from './items';
import type { DeletedUser, MonthlyRecord, User } from './types';
import { katakanaToHiragana, isHiraganaOnly, translateAuthError } from './utils';
import { termsText } from './termsContent';
import { privacyText } from './privacyContent';
import { tokushohoText } from './tokushohoContent';
import { planTiers, freeGenerationLimit } from './stripePrices';
import { createCheckoutSession, createPortalSession, loadConfig, loadUsers } from './storage';
import { supabase } from './supabaseClient';

// ---- 汎用: 警告・確認 ----

export function showWarning(title: string, message: string): Promise<void> {
  return openDialog<void>((close) => (
    <ModalShell width={360} onBackdropClick={() => close()}>
      <h2 className="modal-title">{title}</h2>
      <p className="modal-body">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>OK</button>
      </div>
    </ModalShell>
  ));
}

export function showTermsDialog(): Promise<void> {
  return openDialog<void>((close) => (
    <ModalShell width={560} onBackdropClick={() => close()}>
      <h2 className="modal-title">利用規約</h2>
      <p className="modal-body">{termsText}</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  ));
}

export function showPrivacyDialog(): Promise<void> {
  return openDialog<void>((close) => (
    <ModalShell width={560} onBackdropClick={() => close()}>
      <h2 className="modal-title">プライバシーポリシー</h2>
      <p className="modal-body">{privacyText}</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  ));
}

function PricingDialogView({
  currentResidentCount,
  reason,
  currentPlanKey,
  selectPlan: selectPlanUrl,
  footerExtra,
  close,
}: {
  currentResidentCount: number;
  reason: string;
  currentPlanKey?: string;
  selectPlan: (planKey: string) => Promise<string>;
  footerExtra?: ReactNode;
  close: (value: void) => void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const eligible = planTiers.filter((t) => t.maxResidents >= currentResidentCount);
  const recommendedKey = eligible.find((t) => t.key !== currentPlanKey)?.key ?? eligible[0]?.key;

  async function selectPlan(planKey: string) {
    setErrorText(null);
    setBusyKey(planKey);
    try {
      const url = await selectPlanUrl(planKey);
      window.location.href = url;
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : String(e));
      setBusyKey(null);
    }
  }

  return (
    <ModalShell width={480} onBackdropClick={() => close()}>
      <h2 className="modal-title">プランを選択</h2>
      <p className="modal-body">{reason}</p>
      {eligible.length === 0 && (
        <p className="hint-error">
          現在の登録人数({currentResidentCount}人)に対応するプランがありません。利用者を150人以下に減らすか、お問い合わせください。
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {planTiers.map((tier) => {
          const isCurrent = tier.key === currentPlanKey;
          const belowCurrentCount = tier.maxResidents < currentResidentCount;
          const disabled = isCurrent || belowCurrentCount;
          return (
            <button
              key={tier.key}
              className={tier.key === recommendedKey ? 'btn btn-filled btn-block' : 'btn btn-outlined btn-block'}
              disabled={disabled || busyKey != null}
              onClick={() => selectPlan(tier.key)}
            >
              {tier.label}: {tier.priceYen.toLocaleString()}円/月
              {isCurrent ? '(現在のプラン)' : tier.key === recommendedKey ? '(おすすめ)' : ''}
              {!isCurrent && belowCurrentCount ? ' — 利用者を減らしてください' : ''}
              {busyKey === tier.key ? '(処理中...)' : ''}
            </button>
          );
        })}
      </div>
      {errorText && <p className="hint-error">{errorText}</p>}
      {footerExtra}
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  );
}

export function showPricingDialog(
  currentResidentCount: number,
  reason: string = `無料の${freeGenerationLimit}回を使い切りました。引き続きAI下書き生成をご利用いただくには、いずれかのプランへのお申し込みが必要です。`,
): Promise<void> {
  return openDialog<void>((close) => (
    <PricingDialogView
      currentResidentCount={currentResidentCount}
      reason={reason}
      selectPlan={(planKey) => createCheckoutSession(planKey)}
      close={close}
    />
  ));
}

// 加入中の事業所向けのプラン変更画面。現在の登録人数を下回るプランは
// 選べないようにし、Stripe側では「このプランへの変更」を確定するだけの
// 画面(flow_data)へ直接遷移させる。解約・支払い方法の変更は、通常の
// Customer Portal(createPortalSession()、planKey省略)へ案内する。
export function showPlanChangeDialog(params: {
  currentResidentCount: number;
  currentPlanKey?: string;
  onOpenGeneralPortal: () => Promise<string>;
  onSelectPlan: (planKey: string) => Promise<string>;
}): Promise<void> {
  return openDialog<void>((close) => (
    <PricingDialogView
      currentResidentCount={params.currentResidentCount}
      currentPlanKey={params.currentPlanKey}
      reason="ご利用中のプランを変更できます。現在の登録人数を下回るプランは選択できません。"
      selectPlan={params.onSelectPlan}
      footerExtra={
        <p className="modal-body">
          <button
            type="button"
            className="inline-link"
            onClick={async () => {
              try {
                const url = await params.onOpenGeneralPortal();
                window.location.href = url;
              } catch (e) {
                await showWarning('エラー', e instanceof Error ? e.message : String(e));
              }
            }}
          >
            解約・お支払い方法の変更はこちら
          </button>
        </p>
      }
      close={close}
    />
  ));
}

function AccountDialogView({ close }: { close: (value: void) => void }) {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const config = loadConfig();
  const isSubscribed = config.subscription_status === 'active' || config.subscription_status === 'trialing';

  async function openBilling() {
    setBusy(true);
    try {
      if (isSubscribed) {
        await showPlanChangeDialog({
          currentResidentCount: loadUsers().length,
          currentPlanKey: config.subscription_plan as string | undefined,
          onOpenGeneralPortal: () => createPortalSession(),
          onSelectPlan: (planKey) => createPortalSession(planKey),
        });
      } else {
        close();
        await showPricingDialog(Math.max(loadUsers().length, config.expected_resident_count ?? 0));
      }
    } catch (e) {
      await showWarning('エラー', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function startChangingPassword() {
    setChangingPassword(true);
    setPwSuccess(false);
    setPwError(null);
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
  }

  function cancelChangingPassword() {
    setChangingPassword(false);
    setPwError(null);
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
  }

  async function submitPasswordChange() {
    setPwError(null);
    if (currentPassword === '') {
      setPwError('現在のパスワードを入力してください。');
      return;
    }
    if (!/^[A-Za-z0-9]{8,}$/.test(newPassword)) {
      setPwError('パスワードは8文字以上の半角英数字で入力してください。');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPwError('パスワードが一致しません。');
      return;
    }
    if (email == null) {
      setPwError('メールアドレスを取得できませんでした。時間をおいて再度お試しください。');
      return;
    }
    setPwBusy(true);
    try {
      // なりすまし防止(セッションが乗っ取られた端末等からの不正な変更を防ぐ)のため、
      // 現在のパスワードで再認証できた場合のみ変更を許可する。
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (reauthError) {
        setPwError('現在のパスワードが正しくありません。');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPwError(translateAuthError(error.message));
      } else {
        setChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setPwSuccess(true);
      }
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <ModalShell width={360} onBackdropClick={() => close()}>
      <h2 className="modal-title">アカウント</h2>
      <p className="modal-body">
        {isSubscribed
          ? `ご利用中のプラン: ${planTiers.find((t) => t.key === config.subscription_plan)?.label ?? config.subscription_plan}`
          : `無料枠 残り${Math.max(0, freeGenerationLimit - ((config.free_generations_used as number | undefined) ?? 0))}回`}
      </p>
      <p className="modal-body">{email ?? '読み込み中...'}</p>

      {changingPassword ? (
        <>
          <div className="field">
            <label>現在のパスワード</label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label>新しいパスワード</label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="hint-muted">8文字以上の半角英数字で入力してください</p>
          </div>
          <div className="field">
            <label>新しいパスワード(確認)</label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
            />
          </div>
          {pwError && <p className="hint-error">{pwError}</p>}
          <div className="modal-actions">
            <button className="btn btn-text" disabled={pwBusy} onClick={cancelChangingPassword}>キャンセル</button>
            <button className="btn btn-filled" disabled={pwBusy} onClick={submitPasswordChange}>
              {pwBusy ? '変更中...' : '変更する'}
            </button>
          </div>
        </>
      ) : (
        <>
          <button type="button" className="inline-link" onClick={startChangingPassword}>パスワードを変更</button>
          {pwSuccess && <p className="hint-muted">パスワードを変更しました。</p>}
          <div className="modal-actions">
            <button className="btn btn-outlined" disabled={busy} onClick={openBilling}>
              {isSubscribed ? 'プラン管理' : 'プランを見る'}
            </button>
            <button className="btn btn-text" onClick={() => close()}>閉じる</button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

export function showAccountDialog(): Promise<void> {
  return openDialog<void>((close) => <AccountDialogView close={close} />);
}

const usageGuideText = `① 利用者を追加
左側の利用者一覧の「利用者を追加」から、お名前を登録します。

② 留意点を追加(任意)
既往歴や注意事項など、あらかじめ知っておきたいことがあれば「留意点を追加・編集」から記録しておけます。

③ モード選択で所見項目を調整
右上の「モード選択」から、所見の項目を施設に合わせて追加・削除できます。

④ 今月の所見を入力
プルダウンでの選択・自由記入欄への入力のどちらでも構いません。両方空欄のままでも生成できるので、無理にすべて埋める必要はありません。項目の左端の「☰」をドラッグすると並び順を入れ替えられ、生成される文章の順番もある程度調整できます。
また、「過去の記録の追加・編集」から過去3か月分のモニタリングを入力しておくと、AIによる生成の精度が上がります。

⑤ 文章を生成
「文章を生成」ボタンでAIが下書きを作成します。生成後の文章は自由に編集できます。

⑥ コピーして貼り付け
「文章をコピー」でクリップボードにコピーし、お使いの記録システムなどへ貼り付けてください。

その他
右上の「今月分を出力」から、対象年月の全利用者分の生成結果をまとめてテキストファイルとして書き出すこともできます。`;

export function showUsageGuideDialog(): Promise<void> {
  return openDialog<void>((close) => (
    <ModalShell width={560} onBackdropClick={() => close()}>
      <h2 className="modal-title">使いかた</h2>
      <p className="modal-body">{usageGuideText}</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  ));
}

export function showTokushohoDialog(): Promise<void> {
  return openDialog<void>((close) => (
    <ModalShell width={560} onBackdropClick={() => close()}>
      <h2 className="modal-title">特定商取引法に基づく表記</h2>
      <p className="modal-body">{tokushohoText}</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  ));
}

export function showConfirm(title: string, message: string): Promise<boolean> {
  return openDialog<boolean>((close) => (
    <ModalShell width={360} onBackdropClick={() => close(false)}>
      <h2 className="modal-title">{title}</h2>
      <p className="modal-body">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close(false)}>いいえ</button>
        <button className="btn btn-filled" onClick={() => close(true)}>はい</button>
      </div>
    </ModalShell>
  ));
}

/// 保存確認: null=キャンセル(何もしない), true=保存して続行, false=保存せず続行
export function showSaveConfirm(): Promise<boolean | null> {
  return openDialog<boolean | null>((close) => (
    <ModalShell width={380} onBackdropClick={() => close(null)}>
      <h2 className="modal-title">保存の確認</h2>
      <p className="modal-body">保存されていない変更があります。保存しますか?{'\n'}「いいえ」を選ぶと変更は破棄されます。</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close(null)}>キャンセル</button>
        <button className="btn btn-text" onClick={() => close(false)}>いいえ</button>
        <button className="btn btn-filled" onClick={() => close(true)}>はい</button>
      </div>
    </ModalShell>
  ));
}

let toastHost: HTMLDivElement | null = null;
export function showCenteredToast(message: string, duration = 2000): void {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toast-host';
    document.body.appendChild(toastHost);
  }
  const el = document.createElement('div');
  el.className = 'toast-bubble';
  el.textContent = message;
  toastHost.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ---- 利用者の追加・編集 ----

function AddUserDialogView({ close }: { close: (value: User | null) => void }) {
  const [name, setName] = useState('');
  const [furigana, setFurigana] = useState('');

  async function submit() {
    const trimmedName = name.trim();
    if (trimmedName === '') {
      await showWarning('未入力', '名前を入力してください。');
      return;
    }
    const raw = furigana.trim();
    if (raw === '') {
      await showWarning('未入力', 'フリガナ(ひらがな)を入力してください。');
      return;
    }
    const hira = katakanaToHiragana(raw);
    if (!isHiraganaOnly(hira)) {
      await showWarning('入力エラー', 'フリガナはひらがなで入力してください。');
      return;
    }
    close({ id: crypto.randomUUID(), name: trimmedName, furigana: hira, precautions: '' });
  }

  return (
    <ModalShell width={360} onBackdropClick={() => close(null)}>
      <h2 className="modal-title">利用者を追加</h2>
      <div className="field">
        <label>名前(漢字・ひらがな・カタカナ)</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>フリガナ(ひらがな)</label>
        <input value={furigana} onChange={(e) => setFurigana(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close(null)}>キャンセル</button>
        <button className="btn btn-filled" onClick={submit}>追加</button>
      </div>
    </ModalShell>
  );
}

export function showAddUserDialog(): Promise<User | null> {
  return openDialog<User | null>((close) => <AddUserDialogView close={close} />);
}

function RenameUserDialogView({
  user,
  close,
}: {
  user: User;
  close: (value: { name: string; furigana: string } | null) => void;
}) {
  const [name, setName] = useState(user.name);
  const [furigana, setFurigana] = useState(user.furigana);

  async function submit() {
    const newName = name.trim();
    if (newName === '') {
      await showWarning('未入力', '名前を入力してください。');
      return;
    }
    const hira = katakanaToHiragana(furigana.trim());
    if (hira !== '' && !isHiraganaOnly(hira)) {
      await showWarning('入力エラー', 'フリガナはひらがなで入力してください。');
      return;
    }
    close({ name: newName, furigana: hira });
  }

  return (
    <ModalShell width={360} onBackdropClick={() => close(null)}>
      <h2 className="modal-title">利用者名を編集</h2>
      <div className="field">
        <label>名前</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>フリガナ(ひらがな)</label>
        <input value={furigana} onChange={(e) => setFurigana(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close(null)}>キャンセル</button>
        <button className="btn btn-filled" onClick={submit}>保存</button>
      </div>
    </ModalShell>
  );
}

export function showRenameUserDialog(user: User): Promise<{ name: string; furigana: string } | null> {
  return openDialog((close) => <RenameUserDialogView user={user} close={close} />);
}

function EditPrecautionsDialogView({
  userName,
  initialPrecautions,
  close,
}: {
  userName: string;
  initialPrecautions: string;
  close: (value: string | null) => void;
}) {
  const [text, setText] = useState(initialPrecautions);
  return (
    <ModalShell width={480} onBackdropClick={() => close(null)}>
      <h2 className="modal-title">留意点の追加・編集 - {userName}</h2>
      <p className="modal-body">重要な既往歴や注意事項(月をまたいで保持されます):</p>
      <textarea
        autoFocus
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="modal-textarea"
      />
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close(null)}>キャンセル</button>
        <button className="btn btn-filled" onClick={() => close(text.trim())}>保存</button>
      </div>
    </ModalShell>
  );
}

export function showEditPrecautionsDialog(params: {
  userName: string;
  initialPrecautions: string;
}): Promise<string | null> {
  return openDialog((close) => (
    <EditPrecautionsDialogView
      userName={params.userName}
      initialPrecautions={params.initialPrecautions}
      close={close}
    />
  ));
}

// ---- 削除した利用者一覧 ----

function RestoreDialogView({
  trash: initialTrash,
  onRestore,
  onDeletePermanently,
  close,
}: {
  trash: DeletedUser[];
  onRestore: (u: DeletedUser) => Promise<boolean>;
  onDeletePermanently: (u: DeletedUser) => Promise<void>;
  close: () => void;
}) {
  const [trash, setTrash] = useState(initialTrash);
  return (
    <ModalShell width={440} onBackdropClick={() => close()}>
      <h2 className="modal-title">削除した利用者一覧</h2>
      <div className="modal-list">
        {trash.length === 0 ? (
          <p className="modal-body">削除された利用者はいません。</p>
        ) : (
          trash.map((user) => (
            <div className="list-row" key={user.id}>
              <div className="list-row-main">
                <div>{user.name}</div>
                <div className="list-row-sub">削除日時: {user.deletedAt}</div>
              </div>
              <button
                className="icon-btn"
                title="復元する"
                onClick={async () => {
                  const restored = await onRestore(user);
                  if (!restored) return;
                  const next = trash.filter((x) => x.id !== user.id);
                  setTrash(next);
                  if (next.length === 0) close();
                }}
              >
                ⟲
              </button>
              <button
                className="icon-btn"
                title="完全に削除"
                onClick={async () => {
                  const ok = await showConfirm(
                    '完全に削除',
                    `「${user.name}」を完全に削除します。\n過去の記録データも含めて元に戻せなくなります。よろしいですか?`,
                  );
                  if (!ok) return;
                  await onDeletePermanently(user);
                  setTrash(trash.filter((x) => x.id !== user.id));
                }}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  );
}

export async function showRestoreDialog(params: {
  trash: DeletedUser[];
  onRestore: (u: DeletedUser) => Promise<boolean>;
  onDeletePermanently: (u: DeletedUser) => Promise<void>;
}): Promise<void> {
  if (params.trash.length === 0) {
    await showWarning('復元', '削除された利用者はいません。');
    return;
  }
  await openDialog<void>((close) => (
    <RestoreDialogView
      trash={params.trash}
      onRestore={params.onRestore}
      onDeletePermanently={params.onDeletePermanently}
      close={() => close()}
    />
  ));
}

// ---- 過去の記録を見る ----

export function showHistoryDialog(params: { userName: string; records: MonthlyRecord[] }): Promise<void> {
  const confirmed = params.records
    .filter((r) => r.report !== '')
    .sort((a, b) => (a.yearMonth > b.yearMonth ? -1 : a.yearMonth < b.yearMonth ? 1 : 0));
  return openDialog<void>((close) => (
    <ModalShell width={560} onBackdropClick={() => close()}>
      <h2 className="modal-title">過去の記録 - {params.userName}</h2>
      <div className="modal-list modal-list-tall">
        {confirmed.length === 0 ? (
          <p className="modal-body">確定済みの記録がまだありません。</p>
        ) : (
          confirmed.map((r) => (
            <div key={r.yearMonth} className="history-entry">
              <div className="history-entry-label">■ {r.yearMonth}</div>
              <div className="history-entry-body">{r.report}</div>
            </div>
          ))
        )}
      </div>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  ));
}

// ---- 過去の記録の追加・編集 ----

function AddPastRecordDialogView({
  userName,
  yearValues,
  monthValues,
  initialYear,
  initialMonth,
  existingReports,
  onSave,
  close,
}: {
  userName: string;
  yearValues: string[];
  monthValues: string[];
  initialYear: string;
  initialMonth: string;
  existingReports: Record<string, string>;
  onSave: (yearMonth: string, report: string) => Promise<void>;
  close: () => void;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [localExisting, setLocalExisting] = useState<Record<string, string>>(existingReports);
  const [body, setBody] = useState(existingReports[`${initialYear}-${initialMonth}`] ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const key = `${year}-${month}`;
  const hasExisting = (localExisting[key] ?? '') !== '';

  function changeYear(y: string) {
    setYear(y);
    setBody(localExisting[`${y}-${month}`] ?? '');
  }
  function changeMonth(m: string) {
    setMonth(m);
    setBody(localExisting[`${year}-${m}`] ?? '');
  }

  return (
    <ModalShell width={560} onBackdropClick={() => close()}>
      <h2 className="modal-title">過去の記録の追加・編集 - {userName}</h2>
      <div className="row-inline">
        <span>対象年月:</span>
        <select value={year} onChange={(e) => changeYear(e.target.value)}>
          {yearValues.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span>年</span>
        <select value={month} onChange={(e) => changeMonth(e.target.value)}>
          {monthValues.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span>月</span>
      </div>
      <p className={hasExisting ? 'hint-warn' : 'hint-muted'}>
        {hasExisting ? 'この年月には既に記録があります。編集して保存すると上書きされます。' : 'この年月の記録はまだありません(新規追加)。'}
      </p>
      <p className="modal-body">過去の報告文書:</p>
      <textarea
        rows={12}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="modal-textarea"
      />
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
        <button
          className="btn btn-filled"
          disabled={isSaving}
          onClick={async () => {
            const report = body.trim();
            setIsSaving(true);
            await onSave(key, report);
            setLocalExisting({ ...localExisting, [key]: report });
            setIsSaving(false);
            showCenteredToast('保存しました。');
          }}
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </ModalShell>
  );
}

export function showAddPastRecordDialog(params: {
  userName: string;
  yearValues: string[];
  monthValues: string[];
  initialYear: string;
  initialMonth: string;
  existingReports: Record<string, string>;
  onSave: (yearMonth: string, report: string) => Promise<void>;
}): Promise<void> {
  return openDialog<void>((close) => (
    <AddPastRecordDialogView {...params} close={() => close()} />
  ));
}

// ---- モード選択(言葉遣い・施設種別・所見の項目) ----

// 現在チェックが入っている項目の集合(順序は問わない)が、いずれかの施設種別
// プリセットとぴったり一致するかを調べる。個別にチェックを調整して
// プリセットと一致しなくなった場合は''(未選択表示)を返す。
function matchingPresetKey(keys: Set<string>): string {
  for (const preset of facilityTypePresets) {
    if (preset.itemKeys.length === keys.size && preset.itemKeys.every((k) => keys.has(k))) {
      return preset.key;
    }
  }
  return '';
}

function ItemVisibilityDialogView({
  enabledKeys,
  currentToneKey,
  onSelectTone,
  onToggle,
  onApplyPreset,
  close,
}: {
  enabledKeys: string[];
  currentToneKey: string;
  onSelectTone: (key: string) => void;
  onToggle: (key: string, enabled: boolean) => void;
  onApplyPreset: (keys: string[]) => void;
  close: () => void;
}) {
  const [keys, setKeys] = useState<Set<string>>(new Set(enabledKeys));
  const [selectedPreset, setSelectedPreset] = useState<string>(() => matchingPresetKey(new Set(enabledKeys)));
  const [toneKey, setToneKey] = useState(currentToneKey);

  return (
    <ModalShell width={440} onBackdropClick={() => close()}>
      <h2 className="modal-title">モード選択</h2>
      <div className="modal-list modal-list-tall">
        <div className="facility-preset-label">言葉遣い</div>
        <select
          className="facility-preset-select"
          value={toneKey}
          onChange={(e) => {
            setToneKey(e.target.value);
            onSelectTone(e.target.value);
          }}
        >
          {tonePresets.map((preset) => (
            <option key={preset.key} value={preset.key}>{preset.label}</option>
          ))}
        </select>
        <hr />
        <div className="facility-preset-label">施設種別(選ぶと下のチェックが一括で入れ替わります)</div>
        <select
          className="facility-preset-select"
          value={selectedPreset}
          onChange={async (e) => {
            const preset = facilityTypePresets.find((p) => p.key === e.target.value);
            if (!preset) return;
            // 既に別の施設種別が選ばれている状態から変更する場合は、
            // 現在のチェック内容が上書きされることを確認する。
            if (selectedPreset && selectedPreset !== preset.key) {
              const current = facilityTypePresets.find((p) => p.key === selectedPreset);
              const ok = await showConfirm(
                '施設種別の変更',
                `「${current?.label ?? selectedPreset}」から「${preset.label}」へ変更します。よろしいですか?`,
              );
              if (!ok) return;
            }
            setSelectedPreset(preset.key);
            setKeys(new Set(preset.itemKeys));
            onApplyPreset(preset.itemKeys);
          }}
        >
          <option value="" disabled>施設種別を選択</option>
          {facilityTypePresets.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <hr />
        <div className="facility-preset-label facility-preset-label-sub">項目は自由にカスタマイズできます</div>
        {itemCategories.map((category) => (
          <div key={category.key}>
            <div className="category-heading">{category.label}</div>
            {itemCatalog.filter((i) => i.categoryKey === category.key).map((item) => (
              <label className="checkbox-row" key={item.key}>
                <input
                  type="checkbox"
                  checked={keys.has(item.key)}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    const next = new Set(keys);
                    if (enabled) next.add(item.key); else next.delete(item.key);
                    setKeys(next);
                    setSelectedPreset(matchingPresetKey(next));
                    onToggle(item.key, enabled);
                  }}
                />
                {item.label}
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  );
}

export function showItemVisibilityDialog(params: {
  enabledKeys: string[];
  currentToneKey: string;
  onSelectTone: (key: string) => void;
  onToggle: (key: string, enabled: boolean) => void;
  onApplyPreset: (keys: string[]) => void;
}): Promise<void> {
  return openDialog<void>((close) => <ItemVisibilityDialogView {...params} close={() => close()} />);
}

