
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resendVerification() {
    const email = 'ishansother@gmail.com';
    console.log(`📧 Attempting to resend verification email to: ${email}\n`);

    // Option 1: Use signInWithOtp which sends a magic link
    const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
            shouldCreateUser: false // Don't create if doesn't exist
        }
    });

    if (error) {
        console.log('❌ OTP Error:', error.message);
        console.log('\nTrying alternative: Generate password reset link...');

        // Option 2: Generate a password reset link instead
        const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
            }
        });

        if (resetError) {
            console.log('❌ Reset link error:', resetError.message);
        } else {
            console.log('✅ Password reset link generated!');
            console.log('\nSend this link to Ishan:');
            console.log(resetData.properties.action_link);
            console.log('\nHe can use this to set his password and access the app.');
        }
    } else {
        console.log('✅ Magic link sent!');
        console.log('Ishan should check his email for a login link.');
    }
}

resendVerification();
