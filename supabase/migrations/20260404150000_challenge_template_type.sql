-- Predefined challenge kinds for challenge_templates.type.
-- Add new values later with: ALTER TYPE public.challenge_template_type ADD VALUE 'new_kind';
CREATE TYPE public.challenge_template_type AS ENUM ('queens');

ALTER TABLE public.challenge_templates
  ADD COLUMN type public.challenge_template_type NOT NULL DEFAULT 'queens';
