const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findDev() {
    console.log('🔍 Searching for user "Dev"...');

    // 1. Search in public.users
    const { data: publicUsers, error: publicError } = await supabase
        .from('users')
        .select('*')
        .ilike('full_name', '%Dev%');

    if (publicError) {
        console.error('Error searching public.users:', publicError);
    } else {
        console.log(`\nFound ${publicUsers.length} users in public.users matching "Dev":`);
        publicUsers.forEach(u => console.log(` - ID: ${u.id}, Name: ${u.full_name}, Email: ${u.email}`));
    }

    // 2. List all users in Auth (limit 50) to see if we can find him there
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({ perPage: 50 });

    if (authError) {
        console.error('Error listing auth users:', authError);
    } else {
        console.log(`\nChecking recent Auth users for "Dev"...`);
        const devAuth = authUsers.filter(u =>
            (u.email && u.email.toLowerCase().includes('dev')) ||
            (u.user_metadata && u.user_metadata.full_name && u.user_metadata.full_name.toLowerCase().includes('dev'))
        );

        if (devAuth.length > 0) {
            devAuth.forEach(u => {
                console.log(` - Auth ID: ${u.id}, Email: ${u.email}, Metadata:`, u.user_metadata);
                // Check if this auth user exists in public.users
                const inPublic = publicUsers.find(p => p.id === u.id);
                console.log(`   -> Exists in public.users? ${inPublic ? '✅ YES' : '❌ NO'}`);
            });
        } else {
            console.log('No users found in recent Auth list matching "Dev".');
        }
    }
}

findDev();
