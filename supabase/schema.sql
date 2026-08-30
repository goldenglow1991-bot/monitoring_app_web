-- assist アプリ用のテーブル定義。
-- Supabaseダッシュボードの「SQL Editor」に貼り付けて実行してください。
--
-- 設計方針:
-- ・1アカウント(auth.usersの1レコード) = 1事業所とみなす。
-- ・すべてのテーブルにuser_idを持たせ、RLS(行レベルセキュリティ)で
--   「自分のuser_idの行しか読み書きできない」ように制限する。
-- ・月次記録(monthly_records)は「利用者×年月」で1レコードとして保存する
--   (Flutter/React版のように配列ごと上書きする方式はやめ、レコード単位の
--   upsertにすることで、他の利用者・他の月のデータが巻き添えで消える事故を防ぐ)。
-- ・monthly_recordsのupdated_atは、楽観的ロック(同時編集の検知)に使う。

create extension if not exists "pgcrypto";

-- ---------- 利用者 ----------
create table if not exists residents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  furigana text not null default '',
  precautions text not null default '',
  deleted_at timestamptz, -- nullなら現役、値があれば「削除した利用者一覧」行き
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists residents_user_id_idx on residents(user_id);

-- ---------- 月次記録(利用者×年月で1件) ----------
create table if not exists monthly_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resident_id uuid not null references residents(id) on delete cascade,
  year_month text not null, -- 'YYYY-MM'
  notes text not null default '',
  items jsonb not null default '{}'::jsonb,
  extra_notes text not null default '',
  report text not null default '',
  draft text not null default '',
  draft_generated boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (resident_id, year_month)
);

create index if not exists monthly_records_user_id_idx on monthly_records(user_id);
create index if not exists monthly_records_resident_id_idx on monthly_records(resident_id);

-- ---------- 事業所ごとの設定(所見の項目・言葉遣い・APIキー・PIN等) ----------
create table if not exists facility_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled_items jsonb,
  tone_preset text,
  api_key text,
  pin_hash text,
  last_year_month text,
  updated_at timestamptz not null default now()
);

-- 課金関連(無料10回のカウントは生涯累計。サブスク有効中は参照しない)。
-- 既存のfacility_configテーブルに対して列を追加する(テーブル自体は上のcreate
-- table if not existsが初回作成済みのため、新規列はalterで追加する必要がある)。
alter table facility_config add column if not exists free_generations_used integer not null default 0;
alter table facility_config add column if not exists stripe_customer_id text;
alter table facility_config add column if not exists stripe_subscription_id text;
alter table facility_config add column if not exists subscription_plan text;
alter table facility_config add column if not exists subscription_status text;

-- サインアップ時に(任意で)申告してもらう、登録予定の利用者数。
-- プラン選択画面のおすすめプラン算出に使う(実際の登録人数の下限は下回らない)。
alter table facility_config add column if not exists expected_resident_count integer;

-- ---------- 月ごとのAI生成回数(表示専用。上限判定には使わない) ----------
create table if not exists ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  year_month text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year_month)
);

-- ---------- updated_atの自動更新 ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists residents_set_updated_at on residents;
create trigger residents_set_updated_at
  before update on residents
  for each row execute function set_updated_at();

drop trigger if exists monthly_records_set_updated_at on monthly_records;
create trigger monthly_records_set_updated_at
  before update on monthly_records
  for each row execute function set_updated_at();

drop trigger if exists facility_config_set_updated_at on facility_config;
create trigger facility_config_set_updated_at
  before update on facility_config
  for each row execute function set_updated_at();

-- ---------- RLS(行レベルセキュリティ): 自分のuser_idの行しか触れない ----------
alter table residents enable row level security;
alter table monthly_records enable row level security;
alter table facility_config enable row level security;
alter table ai_usage enable row level security;

drop policy if exists residents_owner on residents;
create policy residents_owner on residents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists monthly_records_owner on monthly_records;
create policy monthly_records_owner on monthly_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists facility_config_owner on facility_config;
create policy facility_config_owner on facility_config
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ai_usageへの書き込みはサービスロールキー(RLS対象外)を使うサーバー関数のみ。
-- 本人は自分の利用回数を読めるだけでよいため、selectポリシーのみ用意する。
drop policy if exists ai_usage_owner_read on ai_usage;
create policy ai_usage_owner_read on ai_usage
  for select
  using (auth.uid() = user_id);
