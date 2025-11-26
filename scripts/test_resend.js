/**
 * Test script to verify Resend email sending
 * Run this locally to test if Resend is working
 */

const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

async function testResend() {
    console.log('\n=== Testing Resend Email Sending ===\n');

    // 1. Check if API key exists
    const apiKey = process.env.RESEND_API_KEY;
    console.log('1. API Key Check:');
    if (!apiKey) {
        console.log('   ❌ RESEND_API_KEY not found in environment');
        return;
    }
    console.log(`   ✅ API Key exists (starts with: ${apiKey.substring(0, 7)}...)`);

    // 2. Initialize Resend
    console.log('\n2. Initializing Resend...');
    const resend = new Resend(apiKey);
    console.log('   ✅ Resend initialized');

    // 3. Try to send a test email
    console.log('\n3. Sending test email...');
    try {
        const { data, error } = await resend.emails.send({
            from: 'Sixth Degree <notifications@mail.sixthdegree.app>',
            to: 'rohan.gandotra19@gmail.com', // Replace with your email
            subject: 'Test Email from Resend',
            html: '<h1>Test</h1><p>If you see this, Resend is working!</p>'
        });

        if (error) {
            console.log('   ❌ Error sending email:');
            console.log('   ', error);
            return;
        }

        console.log('   ✅ Email sent successfully!');
        console.log('   Email ID:', data.id);
        console.log('\n✅ Resend is working correctly!');
        console.log('   Check your inbox for the test email.');

    } catch (error) {
        console.log('   ❌ Exception occurred:');
        console.log('   ', error.message);
        console.log('\n   This might indicate an invalid API key or network issue.');
    }
}

testResend();
