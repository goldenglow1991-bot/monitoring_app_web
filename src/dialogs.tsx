import { useState } from 'react';
import { openDialog, ModalShell } from './dialogHost';
import { itemCategories, itemCatalog, tonePresets, facilityTypePresets } from './items';
import type { DeletedUser, MonthlyRecord, User } from './types';
import { hashPin, isValidPinFormat } from './pinLock';
import { katakanaToHiragana, isHiraganaOnly } from './utils';
import { termsText } from './termsContent';

// ---- 汎用: 警告・確認 ----

export function showWarning(title: string, message: string): Promise<void> {
  return openDialog<void>((close) => (
    <ModalShell width={360}>
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
    <ModalShell width={560}>
      <h2 className="modal-title">利用規約</h2>
      <p className="modal-body">{termsText}</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close()}>閉じる</button>
      </div>
    </ModalShell>
  ));
}

export function showConfirm(title: string, message: string): Promise<boolean> {
  return openDialog<boolean>((close) => (
    <ModalShell width={360}>
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
    <ModalShell width={380}>
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
      await showWarning('未入力', '名前(漢字)を入力してください。');
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
    <ModalShell width={360}>
      <h2 className="modal-title">利用者を追加</h2>
      <div className="field">
        <label>名前(漢字)</label>
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
    <ModalShell width={360}>
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
    <ModalShell width={480}>
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
  onRestore: (u: DeletedUser) => Promise<void>;
  onDeletePermanently: (u: DeletedUser) => Promise<void>;
  close: () => void;
}) {
  const [trash, setTrash] = useState(initialTrash);
  return (
    <ModalShell width={440}>
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
                  await onRestore(user);
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
  onRestore: (u: DeletedUser) => Promise<void>;
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
    <ModalShell width={560}>
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
    <ModalShell width={560}>
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
    <ModalShell width={440}>
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

// ---- APIキー設定 ----

function ApiKeySettingsDialogView({
  currentKey,
  close,
}: {
  currentKey: string;
  close: (value: string | null) => void;
}) {
  const [value, setValue] = useState('');
  const masked =
    currentKey.length > 4
      ? '*'.repeat(currentKey.length - 4) + currentKey.slice(-4)
      : '';
  return (
    <ModalShell width={420}>
      <h2 className="modal-title">APIキー設定</h2>
      <p className="modal-body">現在設定済み: {masked || 'なし'}</p>
      <p className="modal-body">
        このキーはこの端末のブラウザ内(ローカルストレージ)にそのまま保存されます。共有端末で使う場合は取り扱いにご注意ください。
      </p>
      <div className="field">
        <label>Anthropic APIキー</label>
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close(null)}>キャンセル</button>
        <button className="btn btn-filled" onClick={() => close(value.trim())}>保存</button>
      </div>
    </ModalShell>
  );
}

export async function showApiKeySettingsDialog(currentKey: string): Promise<string | null> {
  const result = await openDialog<string | null>((close) => (
    <ApiKeySettingsDialogView currentKey={currentKey} close={close} />
  ));
  if (result == null || result === '') return null;
  return result;
}

// ---- APIキー保護PIN ----

function ManagePinDialogView({
  hasPin,
  currentHash,
  close,
}: {
  hasPin: boolean;
  currentHash: string | undefined;
  close: (action: { type: 'save'; pin: string } | { type: 'remove' } | null) => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  async function checkCurrentPin(): Promise<boolean> {
    if (!hasPin) return true;
    if ((await hashPin(current.trim())) === currentHash) return true;
    setErrorText('現在のPINが違います。');
    return false;
  }

  return (
    <ModalShell width={360}>
      <h2 className="modal-title">APIキー保護PIN</h2>
      <p className="modal-body">設定すると、「APIキー設定」を開くときにこのPINの入力が必要になります。</p>
      {hasPin && (
        <div className="field">
          <label>現在のPIN</label>
          <input type="password" inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>{hasPin ? '新しいPIN(4〜8桁の数字)' : 'PIN(4〜8桁の数字)'}</label>
        <input type="password" inputMode="numeric" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="field">
        <label>確認用</label>
        <input type="password" inputMode="numeric" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {errorText && <p className="hint-error">{errorText}</p>}
      <div className="modal-actions">
        <button className="btn btn-text" onClick={() => close(null)}>キャンセル</button>
        {hasPin && (
          <button
            className="btn btn-text"
            onClick={async () => {
              if (!(await checkCurrentPin())) return;
              close({ type: 'remove' });
            }}
          >
            保護を解除
          </button>
        )}
        <button
          className="btn btn-filled"
          onClick={async () => {
            if (!(await checkCurrentPin())) return;
            const newPin = next.trim();
            if (!isValidPinFormat(newPin)) {
              setErrorText('PINは4〜8桁の数字で入力してください。');
              return;
            }
            if (newPin !== confirm.trim()) {
              setErrorText('確認用のPINが一致しません。');
              return;
            }
            close({ type: 'save', pin: newPin });
          }}
        >
          {hasPin ? '変更する' : '設定する'}
        </button>
      </div>
    </ModalShell>
  );
}

export function showManagePinDialog(params: {
  hasPin: boolean;
  currentHash: string | undefined;
}): Promise<{ type: 'save'; pin: string } | { type: 'remove' } | null> {
  return openDialog((close) => <ManagePinDialogView {...params} close={close} />);
}

/// [expectedHash]が未設定(PIN保護がオフ)なら何もせずtrueを返す。
/// 設定されていれば、一致するまでPIN入力ダイアログを表示する。
export async function requirePin(expectedHash: string | undefined): Promise<boolean> {
  if (!expectedHash) return true;
  return openDialog<boolean>((close) => {
    function View() {
      const [pin, setPin] = useState('');
      const [errorText, setErrorText] = useState<string | null>(null);

      async function submit() {
        if ((await hashPin(pin.trim())) === expectedHash) {
          close(true);
        } else {
          setErrorText('PINが違います。');
          setPin('');
        }
      }

      return (
        <ModalShell width={280}>
          <h2 className="modal-title">PIN確認</h2>
          <div className="field">
            <label>PIN</label>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </div>
          {errorText && <p className="hint-error">{errorText}</p>}
          <div className="modal-actions">
            <button className="btn btn-text" onClick={() => close(false)}>キャンセル</button>
            <button className="btn btn-filled" onClick={submit}>確認</button>
          </div>
        </ModalShell>
      );
    }
    return <View />;
  });
}
