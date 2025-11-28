const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncUser() {
    const userId = '3cd71d25-f544-4512-a60a-f9c4bd3f2ec9';
    const email = 'chintu@mailinator.com';
    const fullName = 'chintu pra';

    console.log(`🔄 Syncing user ${email} (${userId}) to public.users...`);

    // 1. Check if already exists (double check)
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

    if (existing) {
        console.log('✅ User already exists in public.users.');
        return;
    }

    // 2. Insert
    const { error } = await supabase
        .from('users')
        .insert({
            id: userId,
            email: email,
            full_name: fullName,
            password_hash: 'managed_by_supabase_auth' // Dummy value to satisfy constraint
        });

    if (error) {
        console.error('❌ Error inserting user:', error);
    } else {
        console.log('✅ User successfully inserted into public.users!');
    }
}

syncUser();
