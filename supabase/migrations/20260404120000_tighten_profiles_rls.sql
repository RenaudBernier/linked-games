-- Tighten profiles: SELECT own row only; UPDATE cannot change role via API (manual DB edits as privileged role still OK).

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and role = (select p.role from public.profiles p where p.user_id = auth.uid())
  );
