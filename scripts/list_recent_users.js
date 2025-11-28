const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listRecentUsers() {
    console.log('🔍 Listing recent users...');

    // 1. Recent public.users
    const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (publicError) {
        console.error('Error fetching public.users:', publicError);
    } else {
        console.log('\n--- Recent public.users ---');
        publicUsers.forEach(u => console.log(`[${u.created_at}] ID: ${u.id}, Name: ${u.full_name}, Email: ${u.email}`));
    }

    // 2. Recent Auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({ perPage: 10, sortBy: { field: 'created_at', direction: 'desc' } });

    if (authError) {
        console.error('Error fetching auth users:', authError);
    } else {
        console.log('\n--- Recent Auth users ---');
        authUsers.forEach(u => {
            console.log(`[${u.created_at}] ID: ${u.id}, Email: ${u.email}`);
            console.log(`   Metadata:`, u.user_metadata);
        });
    }
}

listRecentUsers();
