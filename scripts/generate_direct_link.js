const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateDirectLink() {
    console.log('--- Generating Direct Password Reset Link ---\n');

    const email = 'rohan.gandotra19@gmail.com';
    // Point directly to the reset page
    const redirectTo = 'https://sixthdegree.app/auth/reset-password';

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            redirectTo: redirectTo
        }
    });

    if (linkError) {
        console.error('❌ Failed to generate reset link:', linkError.message);
    } else {
        console.log('✅ Generated DIRECT reset link:');
        console.log(`   URL: ${linkData.properties.action_link}`);
        console.log(`   Redirects to: ${redirectTo}`);
    }
}

generateDirectLink();
