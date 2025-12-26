
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listRecentAuthUsers() {
    console.log('📋 Listing ALL Auth users (most recent first)...\n');

    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Sort by created_at descending
    const sorted = data.users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`Total Auth Users: ${sorted.length}\n`);

    sorted.forEach((u, i) => {
        console.log(`${i + 1}. ${u.email}`);
        console.log(`   Name: ${u.user_metadata?.full_name || 'N/A'}`);
        console.log(`   Created: ${new Date(u.created_at).toLocaleString()}`);
        console.log(`   Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Last Sign In: ${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}`);
        console.log('');
    });
}

listRecentAuthUsers();
