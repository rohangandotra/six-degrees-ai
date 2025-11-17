import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupDatabase() {
  console.log("[v0] Starting database setup...")

  try {
    // Execute the profiles table creation
    console.log("[v0] Creating profiles table...")
    const { error: profilesError } = await supabase.rpc("exec", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          first_name TEXT,
          last_name TEXT,
          company TEXT,
          job_title TEXT,
          bio TEXT,
          profile_picture_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
        );

        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        CREATE POLICY IF NOT EXISTS "profiles_select_own"
          ON public.profiles FOR SELECT
          USING (auth.uid() = id);

        CREATE POLICY IF NOT EXISTS "profiles_insert_own"
          ON public.profiles FOR INSERT
          WITH CHECK (auth.uid() = id);

        CREATE POLICY IF NOT EXISTS "profiles_update_own"
          ON public.profiles FOR UPDATE
          USING (auth.uid() = id);

        CREATE POLICY IF NOT EXISTS "profiles_delete_own"
          ON public.profiles FOR DELETE
          USING (auth.uid() = id);
      `,
    })

    if (profilesError) {
      console.error("[v0] Error creating profiles table:", profilesError)
    } else {
      console.log("[v0] Profiles table created successfully")
    }

    console.log("[v0] Database setup complete!")
  } catch (error) {
    console.error("[v0] Setup failed:", error)
    process.exit(1)
  }
}

setupDatabase()
