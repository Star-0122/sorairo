-- そらいろ（sorairo）データベース定義 v0.1  ※確認用。まだ Supabase には適用していません。
-- 方針: 全テーブルで RLS を有効化 / 管理者の書き込みは SECURITY DEFINER の関数のみ /
--       管理者が管理できるのは「生徒」だけ（保護者は対象外）/ 秘密鍵はブラウザに置かない

-- ========== 1. テーブル ==========
create table public.roles (
  id    text primary key,                    -- student / parent / teacher / staff / admin
  label text not null
);

create table public.profiles (               -- 認証情報(auth.users)とは分離
  id          uuid primary key references auth.users(id) on delete cascade,
  star_id     text unique,                   -- STAR ID（ユーザーID）
  display_name text not null default '',
  org         text not null default '',
  avatar_path text,
  status      text not null default 'active' check (status in ('active','suspended')),
  created_at  timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.roles(id),
  primary key (user_id, role_id)
);

create table public.employee_profiles (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  employee_no text not null unique,
  dept        text not null default '',
  title       text not null default '',
  status      text not null default 'active' check (status in ('active','inactive'))
);

create table public.employee_attendance (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  work_date   date not null,
  clock_in    timestamptz,
  clock_out   timestamptz,
  break_start timestamptz,
  break_end   timestamptz,
  unique (user_id, work_date),
  check (clock_out is null or clock_in is not null),
  check (clock_out is null or clock_out >= clock_in),
  check ((break_start is null) = (break_end is null)),
  check (break_end is null or break_end > break_start)
);

create table public.services (
  id          text primary key,
  name        text not null,
  description text not null default '',
  category    text not null,
  route       text,                          -- null = 準備中
  icon        text,
  role_ids    text[] not null default '{}',
  published   boolean not null default true,
  sort_order  int not null default 0
);

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 60),
  body       text not null check (char_length(body) between 1 and 2000),
  tag        text not null default 'お知らせ',
  important  boolean not null default false,
  status     text not null default 'draft' check (status in ('draft','published')),
  publish_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.announcement_targets (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  role_id         text not null references public.roles(id),
  primary key (announcement_id, role_id)
);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create table public.user_preferences (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  notify_news      boolean not null default true,
  notify_important boolean not null default true
);

create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id),
  action     text not null,
  created_at timestamptz not null default now()
);

-- ========== 2. 補助関数（権限判定） ==========
create function public.my_roles() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(role_id), '{}') from public.user_roles where user_id = auth.uid()
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role_id = 'admin')
$$;

-- 管理の対象となる「生徒」か（保護者ロールを持つアカウントは対象外）
create function public.is_managed_student(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = uid and role_id = 'student')
     and not exists (select 1 from public.user_roles where user_id = uid and role_id = 'parent')
$$;

-- 生徒だけが対象のお知らせか（全員宛て・保護者宛てを含むものは対象外）
create function public.is_student_only_announcement(aid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.announcement_targets where announcement_id = aid and role_id = 'student')
     and not exists (select 1 from public.announcement_targets where announcement_id = aid and role_id <> 'student')
$$;

-- ========== 3. RLS ==========
alter table public.roles                enable row level security;
alter table public.profiles             enable row level security;
alter table public.user_roles           enable row level security;
alter table public.employee_profiles    enable row level security;
alter table public.employee_attendance  enable row level security;
alter table public.services             enable row level security;
alter table public.announcements        enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_reads   enable row level security;
alter table public.user_preferences     enable row level security;
alter table public.audit_logs           enable row level security;

create policy roles_read on public.roles for select to authenticated using (true);

-- プロフィール: 自分 + 管理者は「生徒」のみ閲覧。本人が変更できるのは氏名と画像だけ
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or (public.is_admin() and public.is_managed_student(id)));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant  update (display_name, avatar_path) on public.profiles to authenticated;

-- ロール付与は管理者でも直接は書けない（招待用 Edge Function がサービスロールで実行）
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or (public.is_admin() and public.is_managed_student(user_id)));

create policy employee_read on public.employee_profiles for select to authenticated
  using (user_id = auth.uid());

-- 勤怠: 本人のみ。社員/管理者ロールのみ記録可。退勤後は本人は変更不可。削除不可
create policy att_read   on public.employee_attendance for select to authenticated using (user_id = auth.uid());
create policy att_insert on public.employee_attendance for insert to authenticated
  with check (user_id = auth.uid() and (public.my_roles() && array['staff','admin']));
create policy att_update on public.employee_attendance for update to authenticated
  using (user_id = auth.uid() and clock_out is null and (public.my_roles() && array['staff','admin']))
  with check (user_id = auth.uid());

create policy services_read on public.services for select to authenticated
  using (published and role_ids && public.my_roles());

-- お知らせ: 公開済み・公開日時を過ぎている・自分のロール宛て。管理者は生徒向けのみ全件
create policy ann_read on public.announcements for select to authenticated
  using (
    (status = 'published' and publish_at <= now()
       and exists (select 1 from public.announcement_targets t
                   where t.announcement_id = id and t.role_id = any (public.my_roles())))
    or (public.is_admin() and public.is_student_only_announcement(id))
  );
create policy ann_targets_read on public.announcement_targets for select to authenticated
  using (exists (select 1 from public.announcements a where a.id = announcement_id));

create policy reads_read   on public.announcement_reads for select to authenticated using (user_id = auth.uid());
create policy reads_insert on public.announcement_reads for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.announcements a where a.id = announcement_id));

create policy prefs_all on public.user_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_read on public.audit_logs for select to authenticated using (public.is_admin());

-- ========== 4. 管理者の書き込み（生徒のみが対象。保護者は拒否） ==========
create function public.admin_update_student(p_id uuid, p_name text, p_org text, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'この操作は管理者のみ行えます。'; end if;
  if not public.is_managed_student(p_id) then raise exception 'このアカウントは管理の対象外です（保護者は管理できません）。'; end if;
  if p_status not in ('active','suspended') then raise exception 'アカウントの状態が正しくありません。'; end if;
  update public.profiles set display_name = trim(p_name), org = trim(p_org), status = p_status where id = p_id;
  insert into public.audit_logs(actor_id, action) values (auth.uid(), '生徒の情報を更新: ' || p_id);
end $$;

create function public.admin_save_announcement(p_id uuid, p_title text, p_body text,
  p_important boolean, p_status text, p_publish_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_id;
begin
  if not public.is_admin() then raise exception 'この操作は管理者のみ行えます。'; end if;
  if v_id is not null and not public.is_student_only_announcement(v_id) then
    raise exception 'このお知らせは管理の対象外です（生徒向けのみ管理できます）。';
  end if;
  if v_id is null then
    insert into public.announcements(title, body, important, tag, status, publish_at, created_by)
    values (trim(p_title), trim(p_body), p_important, case when p_important then '重要' else 'お知らせ' end,
            p_status, coalesce(p_publish_at, now()), auth.uid()) returning id into v_id;
  else
    update public.announcements set title = trim(p_title), body = trim(p_body), important = p_important,
      tag = case when p_important then '重要' else 'お知らせ' end, status = p_status,
      publish_at = coalesce(p_publish_at, now()) where id = v_id;
  end if;
  delete from public.announcement_targets where announcement_id = v_id;
  insert into public.announcement_targets(announcement_id, role_id) values (v_id, 'student'); -- 配信対象は生徒のみ
  insert into public.audit_logs(actor_id, action) values (auth.uid(), 'お知らせを保存: ' || v_id);
  return v_id;
end $$;

create function public.admin_delete_announcement(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'この操作は管理者のみ行えます。'; end if;
  if not public.is_student_only_announcement(p_id) then
    raise exception 'このお知らせは管理の対象外です（生徒向けのみ管理できます）。';
  end if;
  delete from public.announcements where id = p_id;
  insert into public.audit_logs(actor_id, action) values (auth.uid(), 'お知らせを削除: ' || p_id);
end $$;

revoke all on function public.admin_update_student(uuid,text,text,text) from public, anon;
revoke all on function public.admin_save_announcement(uuid,text,text,boolean,text,timestamptz) from public, anon;
revoke all on function public.admin_delete_announcement(uuid) from public, anon;
grant execute on function public.admin_update_student(uuid,text,text,text) to authenticated;
grant execute on function public.admin_save_announcement(uuid,text,text,boolean,text,timestamptz) to authenticated;
grant execute on function public.admin_delete_announcement(uuid) to authenticated;

-- ========== 5. 新規ユーザー作成時にプロフィールを作る ==========
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  insert into public.user_preferences(user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== 6. プロフィール画像（本人のフォルダにだけ書ける・非公開） ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy avatars_own_read   on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_write  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ========== 7. 初期データ（実在しない仮ユーザーは入れません） ==========
insert into public.roles(id, label) values
  ('student','生徒'),('parent','保護者'),('teacher','講師'),('staff','社員'),('admin','管理者');
insert into public.services(id,name,description,category,route,role_ids,sort_order) values
  ('sky','sky+','学習のコンテンツ・宿題確認','学習',null,'{student,parent}',1),
  ('att','出欠確認','出欠状況を確認できます','出欠',null,'{student,parent}',2),
  ('nws','お知らせ','グループからのお知らせ','連絡','/news','{student,parent,staff,admin}',3),
  ('hw','宿題','提出・確認ができます','学習',null,'{student}',4),
  ('log','学習記録','学習の振り返りを確認','学習',null,'{student}',5),
  ('wk','勤怠','出勤・退勤を記録します','社員','/attendance','{staff,admin}',6),
  ('card','社員証','社員証を表示します','社員','/card','{staff,admin}',7),
  ('info','社内情報','社内の情報を確認します','社員',null,'{staff,admin}',8);
