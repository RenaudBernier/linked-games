-- Remove column-only enforcement; we rely on the update policy + trusted app (see prior revision).
DROP TRIGGER IF EXISTS competition_instances_only_ended_at ON public.competition_instances;
DROP FUNCTION IF EXISTS public.competition_instances_only_ended_at_may_change();
