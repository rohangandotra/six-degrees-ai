import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidEmail, checkRateLimit, RATE_LIMITS } from '@/lib/security'
import crypto from 'crypto'

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
    const { email } = body

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Rate limiting: 3 password reset requests per hour per email
    const rateLimit = checkRateLimit(`forgot-password:${email.toLowerCase()}`, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many password reset requests. Please try again later.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()

    // Check if user exists
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    // Always return success to prevent email enumeration
    // Even if user doesn't exist, we say "email sent"
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      })
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomUUID()
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // Store reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error storing reset token:', updateError)
      return NextResponse.json(
        { success: false, message: 'Failed to process password reset request' },
        { status: 500 }
      )
    }

    // Send email using Resend
    const { sendEmail, getPasswordResetTemplate } = await import('@/lib/email')
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sixthdegree.app'}/auth/reset-password#type=recovery&access_token=${resetToken}`
    // Note: We use hash fragment to match what the frontend expects (AuthHashHandler), 
    // OR we can change frontend to read query param. 
    // The existing AuthHashHandler looks for #type=recovery&access_token=...
    // But wait, our custom flow doesn't create a Supabase session, it just verifies the token.
    // The frontend page `app/auth/reset-password/page.tsx` checks `supabase.auth.getSession()`.
    // If we use custom token, we need to update the frontend to verify the token against the DB, NOT Supabase Auth.

    // ACTUALLY: The easiest way is to use Supabase Admin to generate the link, then send it via Resend.
    // This keeps the frontend standard.

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email
    })

    if (linkError) {
      console.error('Error generating link:', linkError)
      return NextResponse.json({ success: false, message: 'Failed to generate reset link' }, { status: 500 })
    }

    const actionLink = linkData.properties.action_link

    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: getPasswordResetTemplate(actionLink)
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    })

  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
