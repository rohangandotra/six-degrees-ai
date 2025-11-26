const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDataIntegrity() {
    console.log('Checking Data Integrity...\n');

    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, full_name');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users.length} users in public table.\n`);

    for (const user of users) {
        // Count contacts
        const { count: contactsCount } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // Count connections
        const { count: connCount } = await supabase
            .from('user_connections')
            .select('id', { count: 'exact', head: true })
            .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

        console.log(`User: ${user.email} (${user.full_name})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Contacts: ${contactsCount}`);
        console.log(`   Connections: ${connCount}`);
        console.log('---');
    }
}

checkDataIntegrity();
