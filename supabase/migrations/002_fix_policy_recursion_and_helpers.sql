-- 001 適用後に行った修正（本番データベースには適用済み。記録用）
drop policy ann_targets_read on public.announcement_targets;
create policy ann_targets_read on public.announcement_targets for select to authenticated
  using (role_id = any (public.my_roles()) or public.is_admin());
revoke all on function public.my_roles() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_managed_student(uuid) from public, anon;
revoke all on function public.is_student_only_announcement(uuid) from public, anon;
grant execute on function public.my_roles() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_managed_student(uuid) to authenticated;
grant execute on function public.is_student_only_announcement(uuid) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
