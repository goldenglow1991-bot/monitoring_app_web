import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as storage from './storage';
import { ConflictError, type AppConfig } from './storage';
import type { DeletedUser, ItemValue, User } from './types';
import { newMonthlyRecord } from './types';
import {
  UNSET,
  itemCatalog,
  defaultEnabledItemKeys,
  defaultTonePresetKey,
  systemPromptFor,
  type ItemDef,
} from './items';
import { compileNotes, pastRecordsText, buildUserPrompt } from './reportBuilder';
import { generateDraft, AnthropicError, QuotaExceededError, ResidentLimitExceededError } from './anthropicClient';
import { planTiers, freeGenerationLimit } from './stripePrices';
import { currentYearMonth, furiganaSortKey, sortUsers } from './utils';
import {
  showWarning,
  showConfirm,
  showSaveConfirm,
  showAddUserDialog,
  showRenameUserDialog,
  showRestoreDialog,
  showEditPrecautionsDialog,
  showHistoryDialog,
  showAddPastRecordDialog,
  showItemVisibilityDialog,
  showPricingDialog,
  showPlanChangeDialog,
  showUsageGuideDialog,
} from './dialogs';
import { ItemRow } from './components/ItemRow';
import { UserListPanelWide, UserListPanelNarrow, UserSelectorMobile, type UserListPage } from './components/UserListPanel';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const TOP_YEAR_VALUES = Array.from({ length: 2040 - 2026 + 1 }, (_, i) => String(2026 + i));
const MONTH_VALUES = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const PAST_YEAR_VALUES = Array.from({ length: 2040 - 2020 + 1 }, (_, i) => String(2020 + i));

const GOJUON_ROWS = ['あ', 'か', 'さ', 'た', 'な', 'ま', 'は', 'や', 'ら', 'わ'];
const GOJUON_ROW_CHARS: Record<string, string[]> = {
  あ: ['あ', 'い', 'う', 'え', 'お'],
  か: ['か', 'き', 'く', 'け', 'こ', 'が', 'ぎ', 'ぐ', 'げ', 'ご'],
  さ: ['さ', 'し', 'す', 'せ', 'そ', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  た: ['た', 'ち', 'つ', 'て', 'と', 'だ', 'ぢ', 'づ', 'で', 'ど'],
  な: ['な', 'に', 'ぬ', 'ね', 'の'],
  は: ['は', 'ひ', 'ふ', 'へ', 'ほ', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
  ま: ['ま', 'み', 'む', 'め', 'も'],
  や: ['や', 'ゆ', 'よ'],
  ら: ['ら', 'り', 'る', 'れ', 'ろ'],
  わ: ['わ', 'を', 'ん'],
};

function gojuonRowOf(key: string): string {
  if (key.length === 0) return 'その他';
  const ch = key[0];
  for (const row of GOJUON_ROWS) {
    if (GOJUON_ROW_CHARS[row].includes(ch)) return row;
  }
  return 'その他';
}

function useContainerWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const measureRef = useRef<() => void>(() => {});

  // useRefではなくコールバックrefにする。「利用者を選択するまでこの要素自体が
  // 存在しない(item-listなど)」ケースでは、単純なuseRef+mount時1回だけの
  // useEffectだと、最初の測定時にref.currentがnullでその後ずっと監視されない
  // ままになってしまう(要素が後から現れてもReactは通知してくれない)ため。
  const setRef = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measureRef.current = measure;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    const onResize = () => measureRef.current();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      observerRef.current?.disconnect();
    };
  }, []);

  return [setRef, width] as const;
}

function emptyItemStatus(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of itemCatalog) result[item.key] = UNSET;
  return result;
}

// 対象年月の初期値。毎月10日以降は、前回選んでいた月に関わらず当月を優先する
// (1〜9日の間は、これまで通り前回選んでいた月を復元する)。
function defaultYearMonth(): string {
  if (new Date().getDate() >= 10) {
    return currentYearMonth();
  }
  const last = (storage.loadConfig().last_year_month as string | undefined) ?? '';
  const parts = last.split('-');
  if (parts.length === 2 && TOP_YEAR_VALUES.includes(parts[0]) && MONTH_VALUES.includes(parts[1])) {
    return last;
  }
  return currentYearMonth();
}

function emptyItemFree(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of itemCatalog) result[item.key] = '';
  return result;
}

export function HomePage({ onExit }: { onExit: () => void }) {
  const [users, setUsers] = useState<User[]>(() => {
    const list = storage.loadUsers();
    sortUsers(list);
    return list;
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [config, setConfigState] = useState<AppConfig>(() => storage.loadConfig());
  const [monthlyUsageCount, setMonthlyUsageCount] = useState<number | null>(null);
  const [itemStatus, setItemStatus] = useState<Record<string, string>>(emptyItemStatus);
  const [itemFree, setItemFree] = useState<Record<string, string>>(emptyItemFree);
  const [extraNotes, setExtraNotes] = useState('');
  const [draft, setDraft] = useState('');
  const [draftGenerated, setDraftGenerated] = useState(false);
  // storage.loadRecords()はReactの状態ではない単なるキャッシュなので、
  // 保存が完了しても自動では再描画されない(利用者一覧の✓表示が古いまま
  // になる)。保存完了後にこれを更新して強制的に再描画させる。
  const [, bumpRecordsTick] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [rowPageIndex, setRowPageIndex] = useState(0);

  const [year, setYear] = useState<string>(() => defaultYearMonth().split('-')[0]);
  const [month, setMonth] = useState<string>(() => defaultYearMonth().split('-')[1]);
  const yearMonth = `${year}-${month}`;

  useEffect(() => {
    // Stripe Checkoutからの戻り(?checkout=success)の検知とプラン情報の
    // 再取得は、StartPage/HomePageどちらが表示されるかに関わらず必ず
    // 一度通るApp.tsx側(ログイン直後のデータ読み込み)で行っている。
    storage.getMonthlyUsageCount().then(setMonthlyUsageCount).catch((e) => console.error('利用状況の取得に失敗しました', e));
  }, []);

  const dirtyRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);

  const saveAndExitRef = useRef<() => Promise<void>>(async () => {});

  function persistConfig(next: AppConfig) {
    setConfigState(next);
    storage.saveConfig(next).catch((e) => console.error('設定の保存に失敗しました', e));
  }

  const visibleItems: ItemDef[] = useMemo(() => {
    const raw = config.enabled_items;
    const keys = Array.isArray(raw) ? raw : defaultEnabledItemKeys;
    const byKey = new Map(itemCatalog.map((i) => [i.key, i] as const));
    return keys.map((k) => byKey.get(k)).filter((i): i is ItemDef => !!i);
  }, [config.enabled_items]);

  function fullItemValues(): Record<string, ItemValue> {
    const result: Record<string, ItemValue> = {};
    for (const item of itemCatalog) {
      result[item.key] = { status: itemStatus[item.key] ?? UNSET, free: itemFree[item.key] ?? '' };
    }
    return result;
  }

  function collectItems(): Record<string, ItemValue> {
    const result: Record<string, ItemValue> = {};
    for (const item of itemCatalog) {
      const status = (itemStatus[item.key] ?? UNSET).trim();
      const free = (itemFree[item.key] ?? '').trim();
      if ((status !== '' && status !== UNSET) || free !== '') {
        result[item.key] = { status, free };
      }
    }
    return result;
  }

  function compileNotesNow(): string {
    return compileNotes(visibleItems, fullItemValues(), extraNotes);
  }

  function markDirty() {
    dirtyRef.current = true;
  }

  function clearItemsForm() {
    setItemStatus(emptyItemStatus());
    setItemFree(emptyItemFree());
  }

  function loadItemsIntoForm(data: Record<string, ItemValue>) {
    const nextStatus = emptyItemStatus();
    const nextFree = emptyItemFree();
    for (const item of itemCatalog) {
      const value = data[item.key];
      nextStatus[item.key] = value && value.status !== '' ? value.status : UNSET;
      nextFree[item.key] = value?.free ?? '';
    }
    setItemStatus(nextStatus);
    setItemFree(nextFree);
  }

  // 指定した利用者・対象年月の内容をフォームへ読み込む。
  function loadFormFor(user: User, targetYearMonth: string) {
    clearItemsForm();
    setExtraNotes('');
    setDraft('');
    const records = storage.loadRecords(user.id);
    const existing = records.find((r) => r.yearMonth === targetYearMonth);
    if (existing) {
      loadItemsIntoForm(existing.items);
      setExtraNotes(existing.extraNotes);
      setDraft(existing.draft !== '' ? existing.draft : existing.report);
    }
    setDraftGenerated(existing?.draftGenerated ?? false);
    dirtyRef.current = false;
  }

  function userDraftGenerated(userId: string, target: string): boolean {
    const records = storage.loadRecords(userId);
    return records.find((r) => r.yearMonth === target)?.draftGenerated ?? false;
  }

  // ---------- save/finalize ----------
  // 月次記録は「利用者×年月」1件単位でSupabaseへupsertする(配列ごとの
  // 上書きはしない)。upsertMonthlyRecordはrecord.updatedAtが自分が最後に
  // 読み込んだ値と一致する時だけ成功させる(楽観的ロック)。一致しなければ
  // ConflictError(=他の端末が先に更新した)を投げる。

  // 自動保存(利用者・年月切替、離席検知)用。競合時は静かに諦めてログだけ残す
  // (自動保存のたびに確認ダイアログを割り込ませると煩わしいため)。
  async function saveInputs(): Promise<void> {
    if (selectedUserId == null) return;
    const target = yearMonth;
    const existing = storage.loadRecords(selectedUserId).find((r) => r.yearMonth === target);
    const report = existing?.report ?? '';
    const draftNow = draft.trim();
    const record = newMonthlyRecord({
      yearMonth: target,
      notes: compileNotesNow(),
      items: collectItems(),
      extraNotes: extraNotes.trim(),
      report,
      draft: draftNow,
      draftGenerated,
      updatedAt: existing?.updatedAt,
    });
    try {
      await storage.upsertMonthlyRecord(selectedUserId, record);
      if (draftNow === report) dirtyRef.current = false;
    } catch (e) {
      console.error('自動保存に失敗しました', e);
    }
  }

  // 明示的な「保存」「保存して終了」用。競合時はユーザーに知らせる
  // (silent:trueの場合は、放置タイムアウト等で人がその場にいない前提のため
  // ダイアログを出さずログだけ残す)。成功したらtrue、失敗したらfalseを返す。
  async function finalizeCurrentRecord(options?: { silent?: boolean }): Promise<boolean> {
    if (selectedUserId == null) return false;
    const draftNow = draft.trim();
    const target = yearMonth;
    const existing = storage.loadRecords(selectedUserId).find((r) => r.yearMonth === target);
    const record = newMonthlyRecord({
      yearMonth: target,
      notes: compileNotesNow(),
      items: collectItems(),
      extraNotes: extraNotes.trim(),
      report: draftNow,
      draft: draftNow,
      draftGenerated,
      updatedAt: existing?.updatedAt,
    });
    try {
      await storage.upsertMonthlyRecord(selectedUserId, record);
      dirtyRef.current = false;
      return true;
    } catch (e) {
      if (options?.silent) {
        console.error('自動終了時の保存に失敗しました', e);
        return false;
      }
      if (e instanceof ConflictError) {
        await showWarning('保存できませんでした', 'この記録は別の端末で更新されています。一度画面を開き直してからもう一度お試しください。');
      } else {
        await showWarning('保存エラー', `保存に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      }
      return false;
    }
  }

  async function finalizeUser() {
    if (selectedUserId == null) {
      await showWarning('未選択', '利用者を選択してください。');
      return;
    }
    const target = yearMonth;
    const ok = await finalizeCurrentRecord();
    if (!ok) return;
    await showWarning('保存完了', `${target} の記録として保存しました。`);
  }

  async function onDraftGeneratedToggle(value: boolean) {
    if (selectedUserId == null) return;
    setDraftGenerated(value);
    const target = yearMonth;
    const existing = storage.loadRecords(selectedUserId).find((r) => r.yearMonth === target);
    const record = existing
      ? { ...existing, draftGenerated: value }
      : newMonthlyRecord({ yearMonth: target, draftGenerated: value });
    try {
      await storage.upsertMonthlyRecord(selectedUserId, record);
    } catch (e) {
      console.error('確認済みチェックの保存に失敗しました', e);
    } finally {
      bumpRecordsTick((n) => n + 1);
    }
  }

  async function copyDraft() {
    const text = draft.trim();
    if (text === '') {
      await showWarning('内容なし', 'コピーする内容がありません。');
      return;
    }
    await navigator.clipboard.writeText(text);
    setStatusText('コピーしました');
    setTimeout(() => setStatusText(''), 1500);
  }

  // ---------- selection ----------

  async function selectUser(user: User) {
    if (user.id === selectedUserId) return;
    if (selectedUserId != null && dirtyRef.current) {
      const answer = await showSaveConfirm();
      if (answer == null) return;
      if (answer) await saveInputs();
      dirtyRef.current = false;
    }
    loadFormFor(user, yearMonth);
    setSelectedUserId(user.id);
  }

  async function changeYearMonth(newYear: string, newMonth: string) {
    if (newYear === year && newMonth === month) return;
    if (selectedUserId != null && dirtyRef.current) {
      await saveInputs();
    }
    setYear(newYear);
    setMonth(newMonth);
    persistConfig({ ...config, last_year_month: `${newYear}-${newMonth}` });
    if (selectedUserId != null) {
      const user = users.find((u) => u.id === selectedUserId);
      if (user) loadFormFor(user, `${newYear}-${newMonth}`);
    }
  }

  // ---------- users ----------

  // 現在のプラン(未加入なら最小プラン)の登録人数の上限。実際の制限は
  // api/generate-draft側(サーバー)でも必ず検証しており、ここでの判定は
  // ユーザーへの早期案内のためのもの。
  function currentPlanCap(): { cap: number; tierLabel: string } {
    const isSubscribedNow = config.subscription_status === 'active' || config.subscription_status === 'trialing';
    const tier = isSubscribedNow ? planTiers.find((t) => t.key === config.subscription_plan) : undefined;
    const cap = tier?.maxResidents ?? planTiers[0].maxResidents;
    return { cap, tierLabel: tier?.label ?? `〜${cap}人` };
  }

  async function openAddUserDialog() {
    const { cap: residentCap, tierLabel } = currentPlanCap();
    if (users.length >= residentCap) {
      await showPricingDialog(
        users.length + 1,
        `現在のプラン(${tierLabel})では、これ以上利用者を登録できません。引き続き利用者を追加するには、いずれかのプランへのお申し込みが必要です。`,
      );
      return;
    }
    const user = await showAddUserDialog();
    if (!user) return;
    try {
      await storage.addUser(user);
    } catch (e) {
      await showWarning('保存エラー', `利用者の追加に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const next = [...users, user];
    sortUsers(next);
    setUsers(next);
  }

  async function renameUser() {
    if (selectedUserId == null) {
      await showWarning('未選択', '利用者を選択してください。');
      return;
    }
    const user = users.find((u) => u.id === selectedUserId)!;
    const result = await showRenameUserDialog(user);
    if (!result) return;
    const updated: User = { ...user, name: result.name, furigana: result.furigana };
    try {
      await storage.updateUser(updated);
    } catch (e) {
      await showWarning('保存エラー', `利用者名の変更に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const next = users.map((u) => (u.id === user.id ? updated : u));
    sortUsers(next);
    setUsers(next);
  }

  async function deleteUser() {
    if (selectedUserId == null) {
      await showWarning('未選択', '利用者を選択してください。');
      return;
    }
    const user = users.find((u) => u.id === selectedUserId)!;
    const ok = await showConfirm(
      '確認',
      `「${user.name}」を一覧から削除しますか?\n(過去記録ファイルは残り、「削除した利用者一覧」からいつでも戻せます)`,
    );
    if (!ok) return;

    const now = new Date();
    const two = (v: number) => String(v).padStart(2, '0');
    const deletedAt = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())} ${two(now.getHours())}:${two(now.getMinutes())}`;
    try {
      await storage.softDeleteUser(user, deletedAt);
    } catch (e) {
      await showWarning('保存エラー', `利用者の削除に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    const next = users.filter((u) => u.id !== user.id);
    setUsers(next);
    setSelectedUserId(null);

    clearItemsForm();
    setExtraNotes('');
    setDraft('');
  }

  async function openRestoreDialog() {
    const trash = storage.loadDeletedUsers();
    await showRestoreDialog({
      trash,
      onRestore: async (u: DeletedUser) => {
        const { cap: residentCap, tierLabel } = currentPlanCap();
        if (storage.loadUsers().length >= residentCap) {
          await showPricingDialog(
            storage.loadUsers().length + 1,
            `現在のプラン(${tierLabel})では、これ以上利用者を登録できません。復元するには、プランを変更するか、他の利用者を削除してください。`,
          );
          return false;
        }
        await storage.restoreUser(u);
        setUsers((prev) => {
          const restored: User = { id: u.id, name: u.name, furigana: u.furigana, precautions: u.precautions };
          const next = [...prev, restored];
          sortUsers(next);
          return next;
        });
        return true;
      },
      onDeletePermanently: async (u: DeletedUser) => {
        await storage.permanentlyDeleteUser(u);
      },
    });
  }

  async function openEditPrecautionsDialog() {
    if (selectedUserId == null) {
      await showWarning('未選択', '利用者を選択してください。');
      return;
    }
    const user = users.find((u) => u.id === selectedUserId)!;
    const result = await showEditPrecautionsDialog({ userName: user.name, initialPrecautions: user.precautions });
    if (result == null) return;
    const updated: User = { ...user, precautions: result };
    try {
      await storage.updateUser(updated);
    } catch (e) {
      await showWarning('保存エラー', `留意点の保存に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    setUsers(users.map((u) => (u.id === user.id ? updated : u)));
  }

  // ---------- history / past record ----------

  async function openHistoryDialog() {
    if (selectedUserId == null) {
      await showWarning('未選択', '利用者を選択してください。');
      return;
    }
    const user = users.find((u) => u.id === selectedUserId)!;
    const records = storage.loadRecords(user.id);
    await showHistoryDialog({ userName: user.name, records });
  }

  async function openAddPastRecordDialog() {
    if (selectedUserId == null) {
      await showWarning('未選択', '利用者を選択してください。');
      return;
    }
    const user = users.find((u) => u.id === selectedUserId)!;
    const cur = currentYearMonth().split('-');
    const initialRecords = storage.loadRecords(user.id);
    const existingReports: Record<string, string> = {};
    for (const r of initialRecords) if (r.report !== '') existingReports[r.yearMonth] = r.report;

    await showAddPastRecordDialog({
      userName: user.name,
      yearValues: PAST_YEAR_VALUES,
      monthValues: MONTH_VALUES,
      initialYear: cur[0],
      initialMonth: cur[1],
      existingReports,
      onSave: async (targetYearMonth, report) => {
        const existing = storage.loadRecords(user.id).find((r) => r.yearMonth === targetYearMonth);
        const record = newMonthlyRecord({
          yearMonth: targetYearMonth,
          notes: existing?.notes ?? '',
          items: existing?.items ?? {},
          extraNotes: existing?.extraNotes ?? '',
          report,
          draft: report,
          // 「確認済み」はAI生成結果を確認したかのフラグなので、手動編集では変更しない。
          draftGenerated: false,
          updatedAt: existing?.updatedAt,
        });
        try {
          await storage.upsertMonthlyRecord(user.id, record);
        } catch (e) {
          if (e instanceof ConflictError) {
            await showWarning('保存できませんでした', 'この記録は別の端末で更新されています。ダイアログを開き直してからもう一度お試しください。');
          } else {
            await showWarning('保存エラー', `保存に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      },
    });
  }

  // ---------- generation ----------

  async function handleGenerateDraft() {
    if (selectedUserId == null) {
      await showWarning('未選択', '利用者を選択してください。');
      return;
    }
    const notes = compileNotesNow();
    if (notes === '') {
      await showWarning('入力なし', '今月の所見を1項目以上入力してください。');
      return;
    }
    if (draft.trim() !== '') {
      const ok = await showConfirm('確認', '生成結果欄に既に文章があります。上書きして再生成しますか?');
      if (!ok) return;
    }
    const user = users.find((u) => u.id === selectedUserId)!;
    const target = yearMonth;
    const records = storage.loadRecords(selectedUserId);
    const pastText = pastRecordsText(records, target);
    const userPrompt = buildUserPrompt({ precautions: user.precautions, pastText, targetYearMonth: target, notes });

    const requestingUserId = selectedUserId;
    const requestingTarget = target;
    const requestingName = user.name;

    setIsGenerating(true);
    setStatusText('生成中...');

    const systemPrompt = systemPromptFor((config.tone_preset as string | undefined) ?? defaultTonePresetKey);

    let resultText: string | undefined;
    let errorMessage: string | undefined;
    let quotaExceeded = false;
    let residentLimitExceeded = false;
    try {
      const accessToken = await storage.getAccessToken();
      resultText = await generateDraft({ accessToken, userPrompt, systemPrompt });
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        quotaExceeded = true;
      } else if (e instanceof ResidentLimitExceededError) {
        residentLimitExceeded = true;
      } else {
        errorMessage = e instanceof AnthropicError ? e.message : String(e);
      }
    }

    setIsGenerating(false);
    setStatusText('');

    if (quotaExceeded) {
      await showPricingDialog(Math.max(users.length, config.expected_resident_count ?? 0));
      return;
    }

    if (residentLimitExceeded) {
      const { tierLabel } = currentPlanCap();
      await showPricingDialog(
        users.length,
        `現在の登録人数(${users.length}人)が、ご利用中のプラン(${tierLabel})の上限を超えています。引き続きご利用いただくには、プランを変更するか、利用者を削除してください。`,
      );
      return;
    }

    if (errorMessage) {
      await showWarning('生成エラー', `${requestingName}さん(${requestingTarget})の文章生成に失敗しました:\n${errorMessage}`);
      return;
    }

    const stillShowing = selectedUserIdRef.current === requestingUserId && yearMonthRef.current === requestingTarget;
    if (stillShowing) {
      setDraft(resultText ?? '');
    } else {
      const existing = storage.loadRecords(requestingUserId).find((r) => r.yearMonth === requestingTarget);
      const record = existing
        ? { ...existing, draft: resultText ?? '' }
        : newMonthlyRecord({ yearMonth: requestingTarget, draft: resultText ?? '' });
      try {
        await storage.upsertMonthlyRecord(requestingUserId, record);
        await showWarning(
          '生成完了',
          `${requestingName}さん(${requestingTarget})の生成が完了しました。\n画面を移動していたため、生成結果は下書きとして保存しました。選択し直してご確認ください。`,
        );
      } catch (e) {
        const detail = e instanceof ConflictError
          ? 'その間に別の端末で同じ記録が更新されたため、生成結果を保存できませんでした。お手数ですが再度生成してください。'
          : `保存に失敗しました: ${e instanceof Error ? e.message : String(e)}`;
        await showWarning('生成完了(保存できず)', `${requestingName}さん(${requestingTarget})の生成は完了しましたが、\n${detail}`);
      }
    }
  }

  // 生成完了時に「まだ同じ画面を見ているか」を判定するための最新値参照。
  const selectedUserIdRef = useRef(selectedUserId);
  selectedUserIdRef.current = selectedUserId;
  const yearMonthRef = useRef(yearMonth);
  yearMonthRef.current = yearMonth;

  // ---------- top bar actions ----------

  function setTonePreset(key: string) {
    persistConfig({ ...config, tone_preset: key });
  }

  async function openModeSelectDialog() {
    const raw = config.enabled_items;
    const enabledKeys = Array.isArray(raw) ? raw : [...defaultEnabledItemKeys];
    await showItemVisibilityDialog({
      enabledKeys,
      currentToneKey: (config.tone_preset as string | undefined) ?? defaultTonePresetKey,
      onSelectTone: setTonePreset,
      onToggle: (key, enabled) => {
        setConfigState((prev) => {
          const keys = Array.isArray(prev.enabled_items) ? [...prev.enabled_items] : [...defaultEnabledItemKeys];
          if (enabled) {
            if (!keys.includes(key)) keys.push(key);
          } else {
            const i = keys.indexOf(key);
            if (i >= 0) keys.splice(i, 1);
          }
          const next = { ...prev, enabled_items: keys };
          storage.saveConfig(next);
          return next;
        });
      },
      onApplyPreset: (keys) => {
        setConfigState((prev) => {
          const next = { ...prev, enabled_items: [...keys] };
          storage.saveConfig(next);
          return next;
        });
      },
    });
  }

  const isSubscribed = config.subscription_status === 'active' || config.subscription_status === 'trialing';

  async function openBilling() {
    try {
      if (isSubscribed) {
        await showPlanChangeDialog({
          currentResidentCount: users.length,
          currentPlanKey: config.subscription_plan as string | undefined,
          onOpenGeneralPortal: () => storage.createPortalSession(),
          onSelectPlan: (planKey) => storage.createPortalSession(planKey),
        });
      } else {
        await showPricingDialog(Math.max(users.length, config.expected_resident_count ?? 0));
      }
    } catch (e) {
      await showWarning('エラー', e instanceof Error ? e.message : String(e));
    }
  }

  async function exportAllUsersDraftText() {
    const ok = await showConfirm('一括出力', `対象年月(${year}年${month}月)の全利用者分の生成結果を、テキストファイルとして出力しますか?`);
    if (!ok) return;

    const blocks = users.map((user) => {
      const text = (user.id === selectedUserId ? draft : storage.loadRecords(user.id).find((r) => r.yearMonth === yearMonth)?.draft ?? '').trim();
      return `■ ${user.name}\n${text !== '' ? text : '(生成結果なし)'}`;
    });
    const content = blocks.join('\n\n') + '\n';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `モニタリング_${year}年${month}月.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 毎回の描画で作り直す通常の関数(useCallbackで固定しない)。以下のRef経由の
  // 呼び出しは、mount時に一度だけ作られるタイマー/visibilitychangeハンドラから
  // 「常に最新のクロージャ」を呼び出すためのもの(古いstateを掴んだままにしない)。
  // 明示的な「保存して終了」ボタン用。保存に失敗(競合含む)したら終了せず、
  // 警告を見てから判断してもらう。
  async function saveAndExit() {
    if (selectedUserIdRef.current != null) {
      const ok = await finalizeCurrentRecord();
      if (!ok) return;
    }
    onExit();
  }

  // 放置タイムアウト/バックグラウンド長時間復帰による自動終了用。
  // 人がその場にいない前提なので確認ダイアログでは止めず、失敗してもログだけ
  // 残してとにかく開始画面へ戻す。
  async function silentSaveAndExit() {
    if (selectedUserIdRef.current != null) {
      await finalizeCurrentRecord({ silent: true });
    }
    onExit();
  }
  saveAndExitRef.current = silentSaveAndExit;

  const saveInputsRef = useRef(saveInputs);
  saveInputsRef.current = saveInputs;

  // ---------- idle timeout / activity / visibility ----------

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => saveAndExitRef.current(), IDLE_TIMEOUT_MS);
  }, []);

  // 未保存の変更があるままタブ・ブラウザを閉じようとした時に、ブラウザ標準の
  // 離脱確認ダイアログを出す。文言はブラウザ側の定型文で、独自メッセージは
  // 表示できない(全ブラウザ共通の仕様)。
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    const onActivity = () => resetIdleTimer();
    document.addEventListener('pointerdown', onActivity);

    // iPadでホーム画面に戻る/タブを閉じるなどでアプリが背面に回った瞬間に呼ばれる。
    // バックグラウンドの間はタイマーが止まっている可能性があるため、10分以上
    // 経ってから復帰した場合は復帰時にまとめて「保存して終了」扱いにする。
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        backgroundedAtRef.current = Date.now();
        if (dirtyRef.current) saveInputsRef.current();
      } else {
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (backgroundedAt != null && Date.now() - backgroundedAt >= IDLE_TIMEOUT_MS) {
          saveAndExitRef.current();
        } else {
          resetIdleTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- user list grouping ----------

  const pages: UserListPage[] = useMemo(() => {
    const result: UserListPage[] = [{ label: 'あいうえお順', users }];
    const groups: Record<string, User[]> = {};
    for (const row of GOJUON_ROWS) groups[row] = [];
    const other: User[] = [];
    for (const u of users) {
      const row = gojuonRowOf(furiganaSortKey(u));
      (groups[row] ?? other).push(u);
    }
    for (const row of GOJUON_ROWS) {
      if (groups[row].length > 0) result.push({ label: `${row}行`, users: groups[row] });
    }
    if (other.length > 0) result.push({ label: 'その他', users: other });
    return result;
  }, [users]);

  const clampedPageIndex = rowPageIndex % pages.length;

  // 所見項目のドラッグ並び替え。Flutter版のReorderableListViewと同じ
  // 考え方(ハンドルを掴んでドラッグすると、他の項目が自動でよけて隙間ができる)を
  // @dnd-kitで実現する。activationConstraintにより、軽くクリックしただけでは
  // 反応せず、実際にある程度動かした時だけドラッグが始まる。
  const itemDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleItems.findIndex((i) => i.key === active.id);
    const newIndex = visibleItems.findIndex((i) => i.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(visibleItems, oldIndex, newIndex);
    persistConfig({ ...config, enabled_items: next.map((i) => i.key) });
  }

  // ---------- layout ----------

  const [contentRef, contentWidth] = useContainerWidth<HTMLDivElement>();
  const [topBarRef, topBarWidth] = useContainerWidth<HTMLDivElement>();
  const [itemListRef, itemListWidth] = useContainerWidth<HTMLDivElement>();

  const mobile = contentWidth > 0 && contentWidth < 480;
  const narrow = contentWidth > 0 && contentWidth < 640;
  const narrowBreakpoint = 640;
  const comfortableBreakpoint = 900;
  const widthRatio = Math.min(1, Math.max(0, (contentWidth - narrowBreakpoint) / (comfortableBreakpoint - narrowBreakpoint)));
  const sidebarWidth = 190 + (220 - 190) * widthRatio;
  const topBarStacked = topBarWidth > 0 && topBarWidth < 1150;
  const labelWidth = Math.min(180, Math.max(100, itemListWidth * 0.25));

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  const listPanelProps = {
    pages,
    pageIndex: clampedPageIndex,
    onPrevPage: () => setRowPageIndex((i) => (i - 1 + pages.length) % pages.length),
    onNextPage: () => setRowPageIndex((i) => (i + 1) % pages.length),
    selectedUserId,
    onSelectUser: selectUser,
    isDraftGenerated: (userId: string) => userDraftGenerated(userId, yearMonth),
    onAdd: openAddUserDialog,
    onRename: renameUser,
    onDelete: deleteUser,
    onRestore: openRestoreDialog,
  };

  return (
    <div className="home-page">
      <div className="top-bar" ref={topBarRef}>
        <div className={`top-bar-inner${topBarStacked ? ' top-bar-stacked' : ''}`}>
          <div className="top-bar-group">
            <button className="btn btn-filled btn-compact" onClick={saveAndExit}>保存して終了</button>
            <button className="btn btn-filled btn-compact" onClick={finalizeUser}>保存</button>
            <span className="year-month-picker">
              対象年月:
              <select value={year} onChange={(e) => changeYearMonth(e.target.value, month)}>
                {TOP_YEAR_VALUES.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              年
              <select value={month} onChange={(e) => changeYearMonth(year, e.target.value)}>
                {MONTH_VALUES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              月
            </span>
          </div>
          <div className="top-bar-group top-bar-group-end">
            <span className="usage-status">
              {isSubscribed
                ? `ご利用中: ${planTiers.find((t) => t.key === config.subscription_plan)?.label ?? config.subscription_plan}${monthlyUsageCount != null ? ` ｜ 今月${monthlyUsageCount}回` : ''}`
                : `無料枠 残り${Math.max(0, freeGenerationLimit - ((config.free_generations_used as number | undefined) ?? 0))}回`}
            </span>
            <button className="btn btn-outlined" onClick={openBilling}>{isSubscribed ? 'プラン管理' : 'プラン選択'}</button>
            <button className="btn btn-outlined" onClick={openModeSelectDialog}>モード選択</button>
            <button className="btn btn-outlined" onClick={exportAllUsersDraftText}>今月分を出力</button>
            <button className="usage-guide-btn" onClick={() => showUsageGuideDialog()} aria-label="使いかた" title="使いかた">?</button>
          </div>
        </div>
      </div>
      <div className="content-area" ref={contentRef}>
        {mobile ? (
          <div className="content-mobile">
            <UserSelectorMobile
              users={users}
              selectedUserId={selectedUserId}
              onSelectUser={selectUser}
              isDraftGenerated={(userId) => userDraftGenerated(userId, yearMonth)}
              onAdd={openAddUserDialog}
              onRename={renameUser}
              onDelete={deleteUser}
              onRestore={openRestoreDialog}
            />
            <div className="right-panel-scroll">
              {renderRightPanel()}
            </div>
          </div>
        ) : narrow ? (
          <div className="content-narrow">
            <div className="user-list-narrow-container">
              <UserListPanelNarrow {...listPanelProps} />
            </div>
            <div className="right-panel-scroll">
              {renderRightPanel()}
            </div>
          </div>
        ) : (
          <div className="content-wide">
            <div className="user-list-wide-container" style={{ width: sidebarWidth }}>
              <UserListPanelWide {...listPanelProps} />
            </div>
            <div className="right-panel-scroll">
              {renderRightPanel()}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function renderRightPanel() {
    if (!selectedUser) {
      return <div className="right-panel-empty">利用者を選択してください</div>;
    }
    return (
      <div className="right-panel">
        <div className="right-panel-header">
          <span className="right-panel-user-name">利用者: {selectedUser.name}</span>
          <button className="btn btn-outlined btn-pill" onClick={openHistoryDialog}>過去の記録を見る</button>
          <button className="btn btn-outlined btn-pill" onClick={openAddPastRecordDialog}>過去の記録の追加・編集</button>
          <button
            type="button"
            className="usage-guide-btn"
            aria-label="過去の記録の追加・編集について"
            title="過去の記録の追加・編集について"
            onClick={() => showWarning(
              '過去の記録の追加・編集',
              '今表示している対象年月以外の、過去の月の記録をあとから追加・編集できます。過去3か月分の記録を入力しておくと、AIによる文章生成の精度が上がります。',
            )}
          >
            !
          </button>
        </div>
        <div className="right-panel-row">
          <span className="panel-label-strong">留意点(重要な既往歴や注意事項)</span>
          <button className="btn btn-filled" onClick={openEditPrecautionsDialog}>留意点を追加・編集</button>
          <button
            type="button"
            className="usage-guide-btn"
            aria-label="留意点の追加・編集について"
            title="留意点の追加・編集について"
            onClick={() => showWarning(
              '留意点の追加・編集',
              '既往歴や注意事項など、月をまたいで保持しておきたい情報を記録できます。ここに入力した内容は、対象年月を変更しても保持されます。',
            )}
          >
            !
          </button>
        </div>
        <div className="precautions-box">
          {selectedUser.precautions !== '' ? selectedUser.precautions : <span className="text-muted">(留意点は未設定です)</span>}
        </div>

        <div className="section-heading">
          <span>今月の所見(プルダウン選択+自由記入。左端の☰で並び替え可能)</span>
          <button
            type="button"
            className="usage-guide-btn"
            aria-label="今月の所見について"
            title="今月の所見について"
            onClick={() => showWarning(
              '今月の所見',
              '各項目は、プルダウンでの選択・自由記入欄への入力のどちらでも構いません。両方空欄のままでも文章は生成できるので、無理にすべて埋める必要はありません。項目左端の「☰」をドラッグすると並び順を入れ替えられ、生成される文章の順番もある程度調整できます。',
            )}
          >
            !
          </button>
        </div>
        <div className="item-list" ref={itemListRef}>
          {visibleItems.length === 0 ? (
            <div className="empty-items-hint">※上部の「モード選択」から所見の項目を選んでください</div>
          ) : (
            <DndContext sensors={itemDragSensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
              <SortableContext items={visibleItems.map((i) => i.key)} strategy={verticalListSortingStrategy}>
                {visibleItems.map((item) => (
                  <ItemRow
                    key={item.key}
                    item={item}
                    labelWidth={labelWidth}
                    status={itemStatus[item.key] ?? UNSET}
                    free={itemFree[item.key] ?? ''}
                    onStatusChange={(key, value) => {
                      setItemStatus((prev) => ({ ...prev, [key]: value }));
                      markDirty();
                    }}
                    onFreeChange={(key, value) => {
                      setItemFree((prev) => ({ ...prev, [key]: value }));
                      markDirty();
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="section-heading">自由記入欄(その他メモ・気づいたことなど)</div>
        <textarea
          className="extra-notes-textarea"
          rows={6}
          value={extraNotes}
          onChange={(e) => { setExtraNotes(e.target.value); markDirty(); }}
        />

        <div className="generation-toolbar">
          <span className="panel-label-strong">生成結果(内容を確認し、自由に編集してください)</span>
          <button className="btn btn-filled" disabled={isGenerating} onClick={handleGenerateDraft}>
            {isGenerating ? '生成中...' : '文章を生成'}
          </button>
          <button className="btn btn-outlined" onClick={copyDraft}>まとめてコピー</button>
          <label className="checkbox-inline">
            <input type="checkbox" checked={draftGenerated} onChange={(e) => onDraftGeneratedToggle(e.target.checked)} />
            確認済み
          </label>
          <span className="status-text">{statusText}</span>
        </div>
        <textarea
          className="draft-textarea"
          rows={12}
          readOnly={isGenerating}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); markDirty(); }}
        />
        {isGenerating && <div className="hint-muted">生成中は編集できません(完了後に編集できます)</div>}
      </div>
    );
  }
}
