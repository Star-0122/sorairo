-- 勤怠: 時刻はサーバーの時刻（日本時間）で記録 / 管理者向け: 生徒のみ宛てのお知らせ一覧（本番適用済み。記録用）
create function public.att_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.clock_in := now(); new.work_date := (now() at time zone 'Asia/Tokyo')::date;
    new.clock_out := null; new.break_start := null; new.break_end := null; return new;
  end if;
  new.user_id := old.user_id; new.work_date := old.work_date; new.clock_in := old.clock_in;
  if old.clock_out is not null then raise exception '退勤後の記録は変更できません。修正が必要な場合は管理者に依頼してください。'; end if;
  if new.break_start is not null then
    if new.break_start < old.clock_in then raise exception '休憩は、出勤時刻以降で入力してください。'; end if;
    if new.break_end > now() + interval '1 minute' then raise exception '現在より先の時刻は入力できません。'; end if;
  end if;
  if new.clock_out is not null then
    new.clock_out := now();
    if new.break_end is not null and new.clock_out < new.break_end then raise exception '休憩の終了が退勤より後になっています。'; end if;
  end if;
  return new;
end $$;
create trigger att_guard before insert or update on public.employee_attendance for each row execute function public.att_guard();
create function public.admin_list_announcements() returns setof public.announcements
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'この操作は管理者のみ行えます。'; end if;
  return query select a.* from public.announcements a where public.is_student_only_announcement(a.id) order by a.publish_at desc;
end $$;
revoke all on function public.admin_list_announcements() from public, anon;
grant execute on function public.admin_list_announcements() to authenticated;
