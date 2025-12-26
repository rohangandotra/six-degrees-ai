
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditSystem() {
    console.log('='.repeat(60));
    console.log('🔍 FULL SYSTEM AUDIT - Email & Signup');
    console.log('='.repeat(60));
    console.log('');

    // 1. Check Environment Variables
    console.log('1️⃣  ENVIRONMENT VARIABLES');
    console.log('-'.repeat(40));
    const envVars = {
        'RESEND_API_KEY': process.env.RESEND_API_KEY ? '✅ Set' : '❌ MISSING',
        'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ MISSING',
        'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ MISSING',
        'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL || '❌ MISSING',
    };
    Object.entries(envVars).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    console.log('');

    // 2. Check Auth Users vs App Users
    console.log('2️⃣  USER SYNC CHECK (Auth vs Users Table)');
    console.log('-'.repeat(40));
    const { data: authData } = await supabase.auth.admin.listUsers();
    const { data: appUsers } = await supabase.from('users').select('id');
    const authCount = authData?.users?.length || 0;
    const appCount = appUsers?.length || 0;
    const ghostCount = authCount - appCount;

    console.log(`   Auth Users: ${authCount}`);
    console.log(`   App Users:  ${appCount}`);
    console.log(`   Ghost Users: ${ghostCount} ${ghostCount > 0 ? '⚠️ MISMATCH' : '✅'}`);
    console.log('');

    // 3. Check Recent Signups (last 7 days)
    console.log('3️⃣  RECENT SIGNUPS (Last 7 Days)');
    console.log('-'.repeat(40));
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsers = authData?.users?.filter(u => new Date(u.created_at) >= sevenDaysAgo) || [];

    if (recentUsers.length === 0) {
        console.log('   No signups in the last 7 days.');
    } else {
        recentUsers.forEach(u => {
            const confirmed = u.email_confirmed_at ? '✅ Verified' : '❌ NOT Verified';
            console.log(`   • ${u.user_metadata?.full_name || 'N/A'} (${u.email})`);
            console.log(`     Created: ${new Date(u.created_at).toLocaleString()}`);
            console.log(`     Status: ${confirmed}`);
        });
    }
    console.log('');

    // 4. Test Resend API
    console.log('4️⃣  RESEND EMAIL TEST');
    console.log('-'.repeat(40));
    if (!process.env.RESEND_API_KEY) {
        console.log('   ❌ Cannot test - RESEND_API_KEY missing');
    } else {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        try {
            // Just verify the API key is valid
            const { data, error } = await resend.domains.list();
            if (error) {
                console.log('   ❌ Resend API Error:', error.message);
            } else {
                console.log('   ✅ Resend API Key is valid');
                console.log('   Domains:', data.data.map(d => `${d.name} (${d.status})`).join(', ') || 'None configured');
            }
        } catch (e) {
            console.log('   ❌ Error testing Resend:', e.message);
        }
    }
    console.log('');

    // 5. Summary
    console.log('='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));

    const issues = [];
    if (ghostCount > 0) issues.push(`${ghostCount} ghost users (Auth/DB mismatch)`);
    if (!process.env.RESEND_API_KEY) issues.push('Missing RESEND_API_KEY');

    const unverified = recentUsers.filter(u => !u.email_confirmed_at);
    if (unverified.length > 0) {
        issues.push(`${unverified.length} recent users NOT verified (emails may not be sending)`);
    }

    if (issues.length === 0) {
        console.log('✅ No critical issues found!');
    } else {
        console.log('⚠️  Issues Found:');
        issues.forEach(i => console.log(`   • ${i}`));
    }

    console.log('');
    console.log('💡 IMPORTANT NOTE:');
    console.log('   Verification emails are sent by SUPABASE, not Resend.');
    console.log('   Check Supabase Dashboard → Auth → Email Templates → SMTP Settings');
    console.log('   to see if custom SMTP is configured.');
}

auditSystem();
