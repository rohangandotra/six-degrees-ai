const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countUsers() {
    console.log('Counting users...');

    // Count profiles in public.users
    const { count: publicCount, error: publicError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    if (publicError) {
        console.error('Error counting public users:', publicError);
    } else {
        console.log(`Total Public Profiles: ${publicCount}`);
    }

    // Count auth users (if possible with service role)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Error listing auth users:', authError);
    } else {
        console.log(`Total Auth Users: ${users.length}`);

        // List the most recent ones
        console.log('\nRecent Signups:');
        const recent = users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        recent.forEach(u => {
            console.log(`- ${u.email} (Created: ${new Date(u.created_at).toLocaleString()})`);
        });
    }
}

countUsers();
