-- ============================================================
-- FIX SIGNUP TRIGGER - Run this in Supabase SQL Editor
-- ============================================================
-- This updates the trigger that runs when a new user signs up.
-- It will insert into public.users (where your app looks for users)
-- instead of just public.profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into public.users (the table your app actually uses)
  INSERT INTO public.users (id, email, full_name, created_at, email_verified, password_hash)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.created_at,
    CASE WHEN new.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    'supabase_auth'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  -- Also insert into profiles for legacy compatibility
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Verify the trigger exists
-- (This just shows info, no action needed)
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
