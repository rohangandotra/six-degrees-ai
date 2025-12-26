
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findGhostUsers() {
    console.log('🔍 Searching for "Ghost Users" (in Auth but not in Users table)...\n');

    // 1. Get all Auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Error fetching Auth users:', authError.message);
        return;
    }

    console.log(`📊 Total users in Auth: ${authUsers.users.length}`);

    // 2. Get all App users
    const { data: appUsers, error: appError } = await supabase.from('users').select('id, email');
    if (appError) {
        console.error('❌ Error fetching App users:', appError.message);
        return;
    }

    console.log(`📊 Total users in App (users table): ${appUsers.length}`);

    // 3. Find Ghost Users
    const appUserIds = new Set(appUsers.map(u => u.id));
    const ghostUsers = authUsers.users.filter(u => !appUserIds.has(u.id));

    console.log(`\n👻 Ghost Users Found: ${ghostUsers.length}`);

    if (ghostUsers.length > 0) {
        console.log('\nThese users signed up but are NOT in the users table:');
        ghostUsers.forEach((u, i) => {
            console.log(`${i + 1}. ${u.email}`);
            console.log(`   ID: ${u.id}`);
            console.log(`   Signed Up: ${new Date(u.created_at).toLocaleString()}`);
            console.log(`   Metadata: ${JSON.stringify(u.user_metadata)}`);
            console.log('');
        });
    } else {
        console.log('✅ No ghost users. All Auth users exist in the users table.');
    }
}

findGhostUsers();
