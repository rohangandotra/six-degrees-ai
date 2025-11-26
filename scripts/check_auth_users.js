const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuthUsers() {
    console.log('Fetching Supabase Auth users (who can actually log in)...\n');

    // Use Admin API to list auth users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error querying auth users:', error.message);
        return;
    }

    console.log(`✅ Total authenticated users: ${users.length}\n`);

    users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
        console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
    });

    // Compare with users table
    console.log('\n--- Comparing with users table ---\n');
    const { data: tableUsers } = await supabase
        .from('users')
        .select('email, id');

    const authEmails = new Set(users.map(u => u.email));
    const tableEmails = new Set(tableUsers.map(u => u.email));

    const inTableNotAuth = tableUsers.filter(u => !authEmails.has(u.email));

    if (inTableNotAuth.length > 0) {
        console.log(`⚠️  ${inTableNotAuth.length} users in 'users' table but NOT in auth (cannot log in):`);
        inTableNotAuth.forEach(u => console.log(`   - ${u.email}`));
    } else {
        console.log('✅ All users in table can authenticate');
    }
}

checkAuthUsers();
