const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
    console.log('Fetching all users...\n');

    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('❌ Error querying users:', error.message);
        return;
    }

    console.log(`✅ Total users: ${users.length}\n`);

    users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name || 'No name'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
    });
}

checkUsers();
