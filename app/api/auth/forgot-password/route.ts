import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidEmail } from '@/lib/security'

/**
 * Request password reset
 * POST /api/auth/forgot-password
 *
 * Body:
 * - email: User's email address
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email: rawEmail } = body
    const email = rawEmail?.trim()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      )
    }

    console.log('[Password Reset] Processing request for:', email.toLowerCase())

    // Use direct Supabase client initialization (proven to work in debug endpoint)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    // Always return success to prevent email enumeration
    if (!user) {
      console.log('[Password Reset] User not found for:', email.toLowerCase())
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      })
    }

    console.log('[Password Reset] User found:', user.id)

    // Generate recovery link using Supabase Auth
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://sixthdegree.app'}/auth/reset-password`
      }
    })

    if (linkError) {
      console.error('[Password Reset] Error generating link:', linkError)
      return NextResponse.json(
        { success: false, message: 'Failed to generate reset link' },
        { status: 500 }
      )
    }

    const actionLink = linkData.properties.action_link
    console.log('[Password Reset] Link generated successfully')

    // Send email using Resend
    const { sendEmail, getPasswordResetTemplate } = await import('@/lib/email')

    const emailResult = await sendEmail({
      to: email.toLowerCase(),
      subject: 'Reset Your Password',
      html: getPasswordResetTemplate(actionLink)
    })

    console.log('[Password Reset] Email send result:', emailResult.success ? 'SUCCESS' : 'FAILED')

    if (!emailResult.success) {
      console.error('[Password Reset] Email failed:', emailResult.error)
      // Still return success to user (don't leak info)
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    })

  } catch (error) {
    console.error('[Password Reset] Exception:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
