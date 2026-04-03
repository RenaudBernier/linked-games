-- Sync profiles.username -> auth.users.raw_user_meta_data, profiles.role -> raw_app_meta_data (JWT)
CREATE OR REPLACE FUNCTION public.sync_profile_claims_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', NEW.username),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_jwt ON public.profiles;
CREATE TRIGGER trg_profiles_sync_jwt
  AFTER INSERT OR UPDATE OF username, role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_claims_to_jwt();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
BEGIN
  uname := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'username', '')), '');
  IF uname IS NOT NULL AND char_length(uname) >= 3 THEN
    INSERT INTO public.profiles (user_id, username, role)
    VALUES (NEW.id, uname, 'participant');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.resolve_login_identifier(identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  email_result text;
BEGIN
  normalized := trim(identifier);
  IF normalized IS NULL OR normalized = '' THEN
    RETURN NULL;
  END IF;
  IF position('@' in normalized) > 0 THEN
    RETURN normalized;
  END IF;
  SELECT au.email INTO email_result
  FROM public.profiles p
  INNER JOIN auth.users au ON au.id = p.user_id
  WHERE lower(p.username) = lower(normalized)
  LIMIT 1;
  RETURN email_result;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_identifier(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(text) TO anon, authenticated;

DROP POLICY IF EXISTS "challenge_templates_insert_authenticated" ON public.challenge_templates;

CREATE POLICY "challenge_templates_insert_admin"
  ON public.challenge_templates FOR INSERT
  TO authenticated
  WITH CHECK (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

CREATE POLICY "challenge_templates_update_admin"
  ON public.challenge_templates FOR UPDATE
  TO authenticated
  USING (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin')
  WITH CHECK (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

CREATE POLICY "challenge_templates_delete_admin"
  ON public.challenge_templates FOR DELETE
  TO authenticated
  USING (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

UPDATE public.profiles SET username = username;
