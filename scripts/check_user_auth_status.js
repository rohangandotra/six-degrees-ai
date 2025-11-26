const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserAuth(email) {
    console.log(`\n--- Checking User: ${email} ---\n`);

    // 1. Check if user exists in auth.users (Supabase Auth)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    const authUser = authData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (authError) {
        console.log('❌ Error checking Supabase Auth:', authError.message);
    } else if (!authUser) {
        console.log('❌ NOT in Supabase Auth (auth.users)');
    } else {
        console.log('✅ EXISTS in Supabase Auth');
        console.log('   User ID:', authUser.id);
        console.log('   Email:', authUser.email);
    }

    // 2. Check if user exists in public.users table
    const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

    if (publicError) {
        console.log('❌ Error checking public.users:', publicError.message);
    } else if (!publicUser) {
        console.log('❌ NOT in public.users table');
    } else {
        console.log('✅ EXISTS in public.users table');
        console.log('   User ID:', publicUser.id);
        console.log('   Name:', publicUser.full_name);
    }

    console.log('\n');
}

async function main() {
    // Check both users
    await checkUserAuth('rohan.gandotra19@gmail.com');
    await checkUserAuth('mirza.ahmad@gmail.com'); // Replace with the other person's email
}

main();
