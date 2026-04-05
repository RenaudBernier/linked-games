-- Competition instances: only admins create; drop participant update policy.
-- Mapping table: no client SELECT; insert/delete admin-only.
-- (challenge_templates insert is already admin-only in 20260403010000.)

DROP POLICY IF EXISTS "competition_instances_insert_as_self" ON public.competition_instances;
CREATE POLICY "competition_instances_insert_admin"
  ON public.competition_instances FOR INSERT
  TO authenticated
  WITH CHECK (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

DROP POLICY IF EXISTS "competition_instances_update_creator" ON public.competition_instances;

DROP POLICY IF EXISTS "mapping_select_authenticated" ON public.competition_instances_challenges_mapping;

DROP POLICY IF EXISTS "mapping_insert_authenticated" ON public.competition_instances_challenges_mapping;
CREATE POLICY "mapping_insert_admin"
  ON public.competition_instances_challenges_mapping FOR INSERT
  TO authenticated
  WITH CHECK (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

DROP POLICY IF EXISTS "mapping_delete_authenticated" ON public.competition_instances_challenges_mapping;
CREATE POLICY "mapping_delete_admin"
  ON public.competition_instances_challenges_mapping FOR DELETE
  TO authenticated
  USING (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');
