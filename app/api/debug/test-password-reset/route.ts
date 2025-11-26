/**
 * Debug endpoint to test password reset flow
 * GET /api/debug/test-password-reset?email=your@email.com
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const email = searchParams.get('email') || 'rohan.gandotra19@gmail.com'

        const logs: string[] = []
        logs.push(`Testing password reset for: ${email}`)

        // 1. Check Supabase connection
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        logs.push('✅ Supabase client created')

        // 2. Check user exists
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('email', email.toLowerCase())
            .maybeSingle()

        if (userError) {
            logs.push(`❌ Error querying users: ${userError.message}`)
        } else if (!user) {
            logs.push(`❌ User not found for: ${email}`)
        } else {
            logs.push(`✅ User found: ${user.id}`)
        }

        // 3. Generate recovery link
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email.toLowerCase()
        })

        if (linkError) {
            logs.push(`❌ Error generating link: ${linkError.message}`)
            return NextResponse.json({ success: false, logs, error: linkError })
        }

        logs.push('✅ Recovery link generated')
        const actionLink = linkData.properties.action_link
        logs.push(`Link: ${actionLink}`)

        // 4. Try to send email
        const { sendEmail, getPasswordResetTemplate } = await import('@/lib/email')
        logs.push('✅ Email module imported')

        const emailResult = await sendEmail({
            to: email.toLowerCase(),
            subject: 'DEBUG: Reset Your Password',
            html: getPasswordResetTemplate(actionLink)
        })

        logs.push(`Email send result: ${JSON.stringify(emailResult)}`)

        return NextResponse.json({
            success: emailResult.success,
            logs,
            emailResult
        })

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
