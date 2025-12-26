
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function updateTrigger() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into public.users
  -- We include password_hash as 'supabase_auth' placeholder if needed, or leave it if default exists
  -- Trying basic fields first.
  INSERT INTO public.users (id, email, full_name, created_at, email_verified, password_hash)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.created_at,
    CASE WHEN new.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    'supabase_auth_managed'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    last_login = NOW();

  -- Insert into public.profiles (maintain legacy support)
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
`;

        console.log('Replacing function handle_new_user()...');
        await client.query(sql);
        console.log('Function updated successfully.');

    } catch (err) {
        console.error('Error updating trigger:', err);
    } finally {
        await client.end();
    }
}

updateTrigger();
