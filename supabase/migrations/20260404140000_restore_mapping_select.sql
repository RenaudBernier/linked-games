-- Participants need to read which challenges are linked to a competition.
DROP POLICY IF EXISTS "mapping_select_authenticated" ON public.competition_instances_challenges_mapping;
CREATE POLICY "mapping_select_authenticated"
  ON public.competition_instances_challenges_mapping FOR SELECT
  TO authenticated
  USING (true);
