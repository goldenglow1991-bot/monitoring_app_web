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
-- 'month' | 'year'。年間プラン(15%オフ)対応のため、契約中の請求間隔を保持する。
alter table facility_config add column if not exists subscription_interval text;

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

-- ---------- facility_configの課金関連列を、サービスロール以外の書き込みから保護 ----------
-- RLSは行単位(自分のuser_idの行かどうか)しか制限できず、列単位の制限はできない。
-- そのため、facility_config_ownerポリシーだけでは、ログイン中の本人がクライアントから
-- 直接subscription_status等を書き換えてプランを自称できてしまう。Stripeの
-- Webhook/生成API(サービスロールキー使用)以外からのINSERT/UPDATEでは、
-- これらの列を常に既存値(INSERT時はNULL/0)に固定することで、実質的に
-- サービスロールのみが書き込めるようにする。
create or replace function facility_config_protect_billing_columns()
returns trigger as $$
begin
  if auth.role() is distinct from 'service_role' then
    if TG_OP = 'UPDATE' then
      new.subscription_status := old.subscription_status;
      new.subscription_plan := old.subscription_plan;
      new.subscription_interval := old.subscription_interval;
      new.stripe_customer_id := old.stripe_customer_id;
      new.stripe_subscription_id := old.stripe_subscription_id;
      new.free_generations_used := old.free_generations_used;
    elsif TG_OP = 'INSERT' then
      new.subscription_status := null;
      new.subscription_plan := null;
      new.subscription_interval := null;
      new.stripe_customer_id := null;
      new.stripe_subscription_id := null;
      new.free_generations_used := 0;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists facility_config_protect_billing on facility_config;
create trigger facility_config_protect_billing
  before insert or update on facility_config
  for each row execute function facility_config_protect_billing_columns();

-- ---------- 無料枠/月間生成回数のアトミックな予約・解放 ----------
-- 「上限チェック→(時間のかかるAI呼び出し)→カウント更新」という手順を
-- サーバー側(api/generate-draft.ts)のJavaScriptで行うと、ほぼ同時に届いた
-- 複数リクエストが両方とも古いカウントでチェックを通過してしまう(TOCTOU)。
-- これを防ぐため、チェックとカウント更新を1つのUPDATE文で行い、Postgresの
-- 行ロックにより同一ユーザーの同時リクエストを直列化する。AI呼び出し前に
-- reserveで枠を確保し、AI呼び出しが失敗した場合のみreleaseで1つ戻す。
--
-- これらの関数はp_user_idを検証なしに受け取るため、クライアントから直接
-- 呼び出せるとp_limit/p_capを自由に指定して上限を無効化できてしまう。
-- そのため実行権限をservice_roleのみに限定する(下のrevoke/grantを参照)。

create or replace function reserve_free_generation(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into facility_config (user_id, free_generations_used)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update facility_config
    set free_generations_used = free_generations_used + 1
    where user_id = p_user_id
      and free_generations_used < p_limit;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function release_free_generation(p_user_id uuid)
returns void
language sql
as $$
  update facility_config
    set free_generations_used = greatest(free_generations_used - 1, 0)
    where user_id = p_user_id;
$$;

-- p_capにnullを渡すと上限チェックをせず、カウント(表示用)のみ増やす。
create or replace function reserve_monthly_usage(p_user_id uuid, p_year_month text, p_cap integer)
returns boolean
language plpgsql
as $$
declare
  v_count integer;
begin
  insert into ai_usage (user_id, year_month, count)
  values (p_user_id, p_year_month, 0)
  on conflict (user_id, year_month) do nothing;

  update ai_usage
    set count = count + 1
    where user_id = p_user_id
      and year_month = p_year_month
      and (p_cap is null or count < p_cap);

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function release_monthly_usage(p_user_id uuid, p_year_month text)
returns void
language sql
as $$
  update ai_usage
    set count = greatest(count - 1, 0)
    where user_id = p_user_id and year_month = p_year_month;
$$;

revoke all on function reserve_free_generation(uuid, integer) from public;
revoke all on function release_free_generation(uuid) from public;
revoke all on function reserve_monthly_usage(uuid, text, integer) from public;
revoke all on function release_monthly_usage(uuid, text) from public;
grant execute on function reserve_free_generation(uuid, integer) to service_role;
grant execute on function release_free_generation(uuid) to service_role;
grant execute on function reserve_monthly_usage(uuid, text, integer) to service_role;
grant execute on function release_monthly_usage(uuid, text) to service_role;

-- ---------- residentsの登録数を、加入中プラン(未加入なら最小プラン)の上限に制限 ----------
-- api/generate-draft.tsは生成時にしか人数上限を検証しないため、利用者の追加・
-- 復元だけを行い生成を一度も呼ばなければ、クライアント側のチェックを回避して
-- (devtools等から直接residentsへinsert/updateして)上限を超えて登録できてしまう。
-- そのため、実際に「現役」の利用者になる操作(新規insert、または削除済みからの
-- 復元でdeleted_atがnullに戻る更新)そのものをDB側でも必ず検証する。
--
-- プランの上限人数(maxResidents)は src/stripePrices.ts の値と手動で一致させること。
create or replace function residents_enforce_plan_cap()
returns trigger as $$
declare
  v_status text;
  v_plan text;
  v_cap integer;
  v_active_count integer;
  v_should_check boolean;
begin
  -- サーバー関数(サービスロールキー使用。復元時のチェック等は呼び出し側で
  -- 既に行っている)からの操作は対象外とする。
  if auth.role() = 'service_role' then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    v_should_check := new.deleted_at is null;
  else
    v_should_check := new.deleted_at is null and old.deleted_at is not null;
  end if;
  if not v_should_check then
    return new;
  end if;

  select subscription_status, subscription_plan into v_status, v_plan
    from facility_config where user_id = new.user_id;

  if v_status is not null and v_status in ('active', 'trialing') then
    v_cap := case v_plan
      when 'tier1' then 20
      when 'tier2' then 40
      when 'tier3' then 70
      when 'tier4' then 110
      when 'tier5' then 150
      else null
    end;
  end if;
  if v_cap is null then
    v_cap := 20; -- 無料枠、またはプラン特定不可時は最小プラン相当を上限とする
  end if;

  select count(*) into v_active_count
    from residents
    where user_id = new.user_id and deleted_at is null and id is distinct from new.id;

  if v_active_count + 1 > v_cap then
    raise exception 'resident_limit_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists residents_enforce_plan_cap on residents;
create trigger residents_enforce_plan_cap
  before insert or update on residents
  for each row execute function residents_enforce_plan_cap();
