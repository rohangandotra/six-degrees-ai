
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
    console.error('❌ Missing environment variables. Check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const FROM_EMAIL = 'Sixth Degree <notifications@mail.sixthdegree.app>';

async function diagnoseEmailFlow(email) {
    console.log(`\n🔍 DIAGNOSING EMAIL FLOW FOR: ${email}\n`);

    // 1. Check public.users
    console.log('1️⃣  Checking public.users table...');
    const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

    if (publicError) {
        console.error('   ❌ Error querying public.users:', publicError.message);
    } else if (!publicUser) {
        console.error('   ❌ User NOT found in public.users');
    } else {
        console.log('   ✅ User found in public.users:', publicUser.id);
    }

    // 2. Check auth.users
    console.log('\n2️⃣  Checking Supabase Auth (auth.users)...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = authData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (authError) {
        console.error('   ❌ Error listing auth users:', authError.message);
    } else if (!authUser) {
        console.error('   ❌ User NOT found in Supabase Auth');
    } else {
        console.log('   ✅ User found in Supabase Auth:', authUser.id);
        console.log('      Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
        console.log('      Last Sign In:', authUser.last_sign_in_at);
    }

    // 3. Generate Recovery Link
    console.log('\n3️⃣  Generating Password Reset Link...');
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase()
    });

    let actionLink = null;
    if (linkError) {
        console.error('   ❌ Error generating link:', linkError.message);
    } else {
        console.log('   ✅ Link generated successfully');
        actionLink = linkData.properties.action_link;
        console.log('      Link:', actionLink);
    }

    // 4. Send Email via Resend
    console.log('\n4️⃣  Sending Email via Resend...');
    if (!actionLink) {
        console.log('   ⚠️  Skipping email send because link generation failed.');
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email.toLowerCase(),
            subject: 'DIAGNOSTIC: Reset Your Password',
            html: `
        <h1>Diagnostic Test Email</h1>
        <p>This is a test to verify the password reset flow.</p>
        <p><strong>Action Link:</strong> <a href="${actionLink}">${actionLink}</a></p>
        <p>If you received this, the entire backend flow is working correctly.</p>
      `
        });

        if (error) {
            console.error('   ❌ Resend API Error:', error);
        } else {
            console.log('   ✅ Email sent successfully!');
            console.log('      ID:', data.id);
        }
    } catch (e) {
        console.error('   ❌ Exception sending email:', e.message);
    }
}

const targetEmail = process.argv[2] || 'rohan.gandotra19@gmail.com';
diagnoseEmailFlow(targetEmail);
