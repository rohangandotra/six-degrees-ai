const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('Connecting to Supabase...');

    // 1. Check if we can count contacts (bypassing RLS)
    const { count, error: countError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error counting contacts:', countError.message);
    } else {
        console.log('✅ Total contacts in DB:', count);
    }

    // 2. Fetch one contact to verify structure
    const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .limit(1);

    if (fetchError) {
        console.error('❌ Error fetching sample contact:', fetchError.message);
    } else if (data && data.length > 0) {
        console.log('✅ Sample contact fetched:', {
            id: data[0].id,
            company: data[0].company,
            position: data[0].position,
            user_id: data[0].user_id
        });
    } else {
        console.log('⚠️ No contacts found in the table.');
    }
}

main();
