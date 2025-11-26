const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setTempPassword() {
    console.log('--- Setting Temporary Password ---\n');

    const email = 'rohan.gandotra19@gmail.com';
    const tempPassword = 'TempPassword123!';

    const { data: user, error } = await supabase.auth.admin.updateUserById(
        '96f99bc7-4d86-4655-887b-0e836c967231', // Rohan's ID
        { password: tempPassword }
    );

    if (error) {
        console.error('❌ Failed to set password:', error.message);
    } else {
        console.log('✅ Password updated successfully!');
        console.log(`   User: ${email}`);
        console.log(`   New Password: ${tempPassword}`);
        console.log('   (Please ask user to change this immediately after login)');
    }
}

setTempPassword();
