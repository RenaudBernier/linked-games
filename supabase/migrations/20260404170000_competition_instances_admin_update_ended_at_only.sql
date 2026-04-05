-- Admins may update competition rows (e.g. set ended_at to close). Client should only patch ended_at.

create policy "competition_instances_update_admin"
  on public.competition_instances for update
  to authenticated
  using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin')
  with check (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');
