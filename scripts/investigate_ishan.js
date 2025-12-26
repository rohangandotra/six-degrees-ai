
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const targetEmail = 'ishansother@gmail.com';

async function investigateEmail() {
    console.log(`🔍 Investigating: ${targetEmail}\n`);

    // 1. Check Auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Auth error:', authError);
        return;
    }

    const authUser = authData.users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
    if (authUser) {
        console.log('✅ Found in Auth!');
        console.log('   ID:', authUser.id);
        console.log('   Created:', authUser.created_at);
        console.log('   Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
    } else {
        console.log('❌ NOT found in Auth - signup never completed at Supabase level.');
    }

    // 2. Check users table
    const { data: appUser, error: appError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', targetEmail)
        .single();

    if (appUser) {
        console.log('\n✅ Found in users table!');
        console.log(appUser);
    } else {
        console.log('\n❌ NOT in users table.');
    }

    // 3. Test signup capability
    console.log('\n🧪 Testing if this email CAN sign up...');
    const testPassword = 'TestPassword123!';
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: targetEmail,
        password: testPassword,
        options: {
            data: {
                full_name: 'Ishan Kapoor',
                first_name: 'Ishan',
                last_name: 'Kapoor'
            }
        }
    });

    if (signupError) {
        console.log('❌ Signup test FAILED:', signupError.message);
        console.log('   Error code:', signupError.code);
        console.log('   Status:', signupError.status);
    } else if (signupData.user) {
        console.log('✅ Signup test SUCCEEDED!');
        console.log('   User ID:', signupData.user.id);
        console.log('   Email confirmation required:', !signupData.user.email_confirmed_at);
        console.log('\n⚠️  NOTE: A real signup was created. Ishan should check his email for verification!');
    }
}

investigateEmail();
