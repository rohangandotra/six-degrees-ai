const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersSchema() {
    console.log('Checking users table schema...\n');

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error);
    } else if (data && data.length > 0) {
        console.log('Sample row keys:', Object.keys(data[0]));
        console.log('Sample row:', data[0]);
    } else {
        console.log('Table is empty or no access.');
    }
}

checkUsersSchema();
