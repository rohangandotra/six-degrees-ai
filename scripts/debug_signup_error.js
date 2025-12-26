
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSignup() {
    const email = `rohangandotra+test_${Date.now()}@gmail.com`;
    const password = 'TestPassword123!';

    console.log(`Attempting to sign up user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: 'Test',
                last_name: 'User',
            }
        }
    });

    if (error) {
        console.error('❌ Sign up failed:', error);
        // Check if it's a 500
        if (error.status === 500) {
            console.error('Possible Trigger Failure. Check database logs.');
        }
    } else {
        console.log('✅ Sign up successful:', data.user.id);

        // Check if profile was created
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('❌ Profile check failed:', profileError);
        } else if (!profile) {
            console.error('❌ Profile NOT created by trigger!');
        } else {
            console.log('✅ Profile created successfully:', profile);
        }

        // Cleanup
        await supabase.auth.admin.deleteUser(data.user.id);
        console.log('Cleaned up test user.');
    }
}

testSignup();
