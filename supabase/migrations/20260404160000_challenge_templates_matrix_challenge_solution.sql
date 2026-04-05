-- Replace single matrix with challenge (puzzle) + solution payloads.
ALTER TABLE public.challenge_templates
  ADD COLUMN matrix_challenge jsonb,
  ADD COLUMN matrix_solution jsonb;

UPDATE public.challenge_templates
SET
  matrix_challenge = matrix,
  matrix_solution = matrix
WHERE matrix IS NOT NULL;

ALTER TABLE public.challenge_templates
  ALTER COLUMN matrix_challenge SET NOT NULL,
  ALTER COLUMN matrix_solution SET NOT NULL;

ALTER TABLE public.challenge_templates
  DROP COLUMN matrix;
