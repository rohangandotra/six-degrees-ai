-- Add referral columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);

-- Function to generate a random referral code if not provided
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    -- Generate a random 8-character code (e.g., REF-12345678)
    -- Using substring of md5 hash of random number + email
    NEW.referral_code := 'REF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.email), 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically assign referral code on insert
DROP TRIGGER IF EXISTS trigger_assign_referral_code ON public.users;
CREATE TRIGGER trigger_assign_referral_code
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();
