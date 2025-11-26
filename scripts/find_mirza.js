const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findMirza() {
    console.log('--- Searching for Mirza/Akhtar accounts ---\n');

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .or('email.ilike.%mirza%,email.ilike.%akhtar%,full_name.ilike.%mirza%,full_name.ilike.%akhtar%');

    if (error) {
        console.error('Error searching users:', error);
        return;
    }

    console.log(`Found ${users.length} matching accounts:`);
    users.forEach(u => {
        console.log(`- Name: ${u.full_name}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  ID: ${u.id}`);
        console.log(`  Created: ${u.created_at}`);
        console.log('---');
    });
}

findMirza();
