
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
    // Fetch one row
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Columns in users table:', Object.keys(data[0]));
        console.log('Sample row:', data[0]);
    } else {
        console.log('Users table empty or not accessible.');
    }
}

inspect();
