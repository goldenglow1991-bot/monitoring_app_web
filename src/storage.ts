import { supabase } from './supabaseClient';
import type { DeletedUser, ItemValue, MonthlyRecord, User } from './types';
import { newMonthlyRecord } from './types';
import { facilityTypePresets } from './items';
import { currentYearMonth } from './utils';

// Supabase(residents / monthly_records / facility_config テーブル)を
// 正としつつ、画面側からは今まで通り同期的に読める「メモリ上のキャッシュ」を
// 提供する永続化レイヤー。
//
// 設計:
// ・アプリ起動(ログイン)時に loadAll() で全データを一度読み込み、キャッシュに載せる。
// ・読み取り系(loadUsers/loadDeletedUsers/loadRecords/loadConfig)は
//   すべて同期関数のまま、キャッシュを返す(既存コードの呼び出し方を変えずに済む)。
// ・書き込み系は非同期でSupabaseに反映しつつ、キャッシュも更新する。
// ・monthly_recordsの保存(upsertMonthlyRecord)は「利用者×年月」1件単位で行い、
//   他の月・他の利用者を巻き込んで上書きすることがないようにする。
// ・同じレコードを更新する時は、自分が最後に読み込んだupdated_atと一致する場合
//   だけ成功させる(楽観的ロック)。一致しなければConflictErrorを投げる。

export class ConflictError extends Error {
  constructor() {
    super('この内容は別の端末で更新されています。');
  }
}

export interface AppConfig {
  last_year_month?: string;
  enabled_items?: string[];
  tone_preset?: string;
  api_key?: string;
  pin_hash?: string;
  free_generations_used?: number;
  subscription_plan?: string;
  subscription_status?: string;
  [key: string]: unknown;
}

interface ResidentRow {
  id: string;
  name: string;
  furigana: string;
  precautions: string;
  deleted_at: string | null;
}

interface RecordRow {
  resident_id: string;
  year_month: string;
  notes: string;
  items: Record<string, ItemValue>;
  extra_notes: string;
  report: string;
  draft: string;
  draft_generated: boolean;
  updated_at: string;
}

interface ConfigRow {
  enabled_items: string[] | null;
  tone_preset: string | null;
  api_key: string | null;
  pin_hash: string | null;
  last_year_month: string | null;
  free_generations_used: number | null;
  subscription_plan: string | null;
  subscription_status: string | null;
}

function rowToUser(row: ResidentRow): User {
  return { id: row.id, name: row.name, furigana: row.furigana, precautions: row.precautions };
}

function rowToDeletedUser(row: ResidentRow): DeletedUser {
  return { ...rowToUser(row), deletedAt: row.deleted_at ?? '' };
}

function rowToRecord(row: RecordRow): MonthlyRecord {
  return newMonthlyRecord({
    yearMonth: row.year_month,
    notes: row.notes,
    items: row.items ?? {},
    extraNotes: row.extra_notes,
    report: row.report,
    draft: row.draft,
    draftGenerated: row.draft_generated,
    updatedAt: row.updated_at,
  });
}

// ---------- キャッシュ ----------
let residentsCache: User[] = [];
let deletedResidentsCache: DeletedUser[] = [];
const recordsCache = new Map<string, MonthlyRecord[]>();
let configCache: AppConfig = {};
// サインアップ時に選んだ施設種別(ユーザーメタデータ)。AIへの立場設定
// (systemPromptFor)の切り替えに使う。手動でプリセットを選び直しても
// ここは更新されない(あくまでサインアップ時点の値)。
let facilityTypeCache: string | undefined;

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data.session?.user.id;
  if (!uid) throw new Error('ログインしていません。');
  return uid;
}

// AI下書き生成をサーバー(api/generate-draft)に依頼する際、本人確認のために
// 添える現在のセッションのアクセストークン。
export async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('ログインしていません。');
  return token;
}

// サインアップ時に入力した施設種別(ユーザーメタデータ)を、facility_configが
// まだ一度も作られていない(=初回ログイン)場合にだけ適用する。2回目以降の
// ログインや、アプリ内で既に設定済みの場合は何もしない。
export async function applyInitialFacilityTypeFromSignup(): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const presetKey = userData.user?.user_metadata?.facility_type as string | undefined;
  if (!presetKey) return;
  const uid = userData.user!.id;

  const { data: existing, error: existingErr } = await supabase
    .from('facility_config')
    .select('user_id')
    .eq('user_id', uid)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;

  const preset = facilityTypePresets.find((p) => p.key === presetKey);
  if (!preset) return;

  const { error } = await supabase.from('facility_config').insert({ user_id: uid, enabled_items: preset.itemKeys });
  if (error) throw error;
}

// ログイン後、画面を表示する前に一度だけ呼ぶ。全データをキャッシュへ読み込む。
export async function loadAll(): Promise<void> {
  const [residentsRes, recordsRes, configRes, userRes] = await Promise.all([
    supabase.from('residents').select('id, name, furigana, precautions, deleted_at').order('created_at', { ascending: true }),
    supabase.from('monthly_records').select('resident_id, year_month, notes, items, extra_notes, report, draft, draft_generated, updated_at'),
    supabase.from('facility_config').select('enabled_items, tone_preset, api_key, pin_hash, last_year_month, free_generations_used, subscription_plan, subscription_status').maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (residentsRes.error) throw residentsRes.error;
  if (recordsRes.error) throw recordsRes.error;
  if (configRes.error) throw configRes.error;
  facilityTypeCache = userRes.data.user?.user_metadata?.facility_type as string | undefined;

  const residentRows = (residentsRes.data ?? []) as ResidentRow[];
  residentsCache = residentRows.filter((r) => r.deleted_at == null).map(rowToUser);
  deletedResidentsCache = residentRows.filter((r) => r.deleted_at != null).map(rowToDeletedUser);

  recordsCache.clear();
  for (const row of (recordsRes.data ?? []) as RecordRow[]) {
    const list = recordsCache.get(row.resident_id) ?? [];
    list.push(rowToRecord(row));
    recordsCache.set(row.resident_id, list);
  }

  const configRow = configRes.data as ConfigRow | null;
  configCache = configRow
    ? {
        enabled_items: configRow.enabled_items ?? undefined,
        tone_preset: configRow.tone_preset ?? undefined,
        api_key: configRow.api_key ?? undefined,
        pin_hash: configRow.pin_hash ?? undefined,
        last_year_month: configRow.last_year_month ?? undefined,
        free_generations_used: configRow.free_generations_used ?? undefined,
        subscription_plan: configRow.subscription_plan ?? undefined,
        subscription_status: configRow.subscription_status ?? undefined,
      }
    : {};
}

export function loadFacilityType(): string | undefined {
  return facilityTypeCache;
}

// 今月のAI生成回数(表示専用)。
export async function getMonthlyUsageCount(): Promise<number> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', uid)
    .eq('year_month', currentYearMonth())
    .maybeSingle();
  if (error) throw error;
  return (data?.count as number | undefined) ?? 0;
}

// ---------- 課金 ----------
async function callBillingApi(path: string, body: Record<string, unknown>): Promise<string> {
  const accessToken = await getAccessToken();
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const decoded = await resp.json();
  if (!resp.ok) {
    if (decoded?.error === 'resident_limit_exceeded') {
      throw new Error('現在の登録人数が、変更先のプランの上限を超えているため変更できません。利用者を減らしてから、もう一度お試しください。');
    }
    throw new Error(decoded?.detail ?? decoded?.error ?? `リクエストに失敗しました(${resp.status})`);
  }
  return decoded.url as string;
}

export function createCheckoutSession(planKey: string): Promise<string> {
  return callBillingApi('/api/create-checkout-session', { planKey, origin: window.location.origin });
}

export function createPortalSession(planKey?: string): Promise<string> {
  return callBillingApi('/api/create-portal-session', { origin: window.location.origin, planKey });
}

// キャッシュだけを空に戻す(ログアウト時)。
export function clearCache(): void {
  residentsCache = [];
  deletedResidentsCache = [];
  recordsCache.clear();
  configCache = {};
  facilityTypeCache = undefined;
}

// ---------- 利用者 ----------
export function loadUsers(): User[] {
  return residentsCache;
}

export async function addUser(user: User): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from('residents').insert({
    id: user.id,
    user_id: uid,
    name: user.name,
    furigana: user.furigana,
    precautions: user.precautions,
  });
  if (error) throw error;
  residentsCache = [...residentsCache, user];
}

export async function updateUser(user: User): Promise<void> {
  const { error } = await supabase
    .from('residents')
    .update({ name: user.name, furigana: user.furigana, precautions: user.precautions })
    .eq('id', user.id);
  if (error) throw error;
  residentsCache = residentsCache.map((u) => (u.id === user.id ? user : u));
}

export function loadDeletedUsers(): DeletedUser[] {
  return deletedResidentsCache;
}

export async function softDeleteUser(user: User, deletedAt: string): Promise<void> {
  const { error } = await supabase.from('residents').update({ deleted_at: deletedAt }).eq('id', user.id);
  if (error) throw error;
  residentsCache = residentsCache.filter((u) => u.id !== user.id);
  deletedResidentsCache = [...deletedResidentsCache, { ...user, deletedAt }];
}

export async function restoreUser(user: DeletedUser): Promise<void> {
  const { error } = await supabase.from('residents').update({ deleted_at: null }).eq('id', user.id);
  if (error) throw error;
  deletedResidentsCache = deletedResidentsCache.filter((u) => u.id !== user.id);
  const { deletedAt: _deletedAt, ...restored } = user;
  residentsCache = [...residentsCache, restored];
}

export async function permanentlyDeleteUser(user: DeletedUser): Promise<void> {
  // residentsの行を削除すると、外部キーのon delete cascadeでmonthly_recordsも
  // まとめて消える。
  const { error } = await supabase.from('residents').delete().eq('id', user.id);
  if (error) throw error;
  deletedResidentsCache = deletedResidentsCache.filter((u) => u.id !== user.id);
  recordsCache.delete(user.id);
}

// ---------- 月次記録 ----------
export function loadRecords(residentId: string): MonthlyRecord[] {
  return recordsCache.get(residentId) ?? [];
}

// 「利用者×年月」1件だけを保存する。record.updatedAtが自分が最後に読み込んだ
// 値と一致する時だけ成功させ(楽観的ロック)、一致しなければConflictErrorを
// 投げる。新規作成の場合(updatedAtがない)は、既に他の端末が同じ年月の記録を
// 作っていた場合もConflictErrorとして扱う。
export async function upsertMonthlyRecord(residentId: string, record: MonthlyRecord): Promise<MonthlyRecord> {
  const uid = await requireUserId();
  const payload = {
    user_id: uid,
    resident_id: residentId,
    year_month: record.yearMonth,
    notes: record.notes,
    items: record.items,
    extra_notes: record.extraNotes,
    report: record.report,
    draft: record.draft,
    draft_generated: record.draftGenerated,
  };

  if (record.updatedAt) {
    const { data, error } = await supabase
      .from('monthly_records')
      .update(payload)
      .eq('resident_id', residentId)
      .eq('year_month', record.yearMonth)
      .eq('updated_at', record.updatedAt)
      .select('resident_id, year_month, notes, items, extra_notes, report, draft, draft_generated, updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ConflictError();
    const saved = rowToRecord(data as RecordRow);
    replaceRecordInCache(residentId, saved);
    return saved;
  }

  const { data, error } = await supabase
    .from('monthly_records')
    .insert(payload)
    .select('resident_id, year_month, notes, items, extra_notes, report, draft, draft_generated, updated_at')
    .single();
  if (error) {
    if (error.code === '23505') throw new ConflictError(); // unique制約違反=既に存在した
    throw error;
  }
  const saved = rowToRecord(data as RecordRow);
  replaceRecordInCache(residentId, saved);
  return saved;
}

function replaceRecordInCache(residentId: string, record: MonthlyRecord): void {
  const list = recordsCache.get(residentId) ?? [];
  const next = list.filter((r) => r.yearMonth !== record.yearMonth);
  next.push(record);
  recordsCache.set(residentId, next);
}

export async function deleteRecords(residentId: string): Promise<void> {
  const { error } = await supabase.from('monthly_records').delete().eq('resident_id', residentId);
  if (error) throw error;
  recordsCache.delete(residentId);
}

// ---------- 事業所ごとの設定 ----------
export function loadConfig(): AppConfig {
  return configCache;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from('facility_config').upsert({
    user_id: uid,
    enabled_items: config.enabled_items ?? null,
    tone_preset: config.tone_preset ?? null,
    api_key: config.api_key ?? null,
    pin_hash: config.pin_hash ?? null,
    last_year_month: config.last_year_month ?? null,
  });
  if (error) throw error;
  // DBに書き込むのはこの5フィールドのみなので、キャッシュもこの5フィールドだけを
  // 更新する。configをそのままconfigCacheに代入すると、呼び出し元がReact stateの
  // 古いスナップショットから作った(billing系フィールドを含む)configオブジェクトを
  // 渡した場合に、Webhook等が別途更新した課金情報がキャッシュ上で古い値に
  // 巻き戻ってしまう。
  configCache = {
    ...configCache,
    enabled_items: config.enabled_items,
    tone_preset: config.tone_preset,
    api_key: config.api_key,
    pin_hash: config.pin_hash,
    last_year_month: config.last_year_month,
  };
}
