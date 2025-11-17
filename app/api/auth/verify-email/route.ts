import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Verify email with token
 * POST /api/auth/verify-email
 *
 * Body:
 * - token: Verification token from email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Verification token is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Find user with this verification token
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('verification_token', token)
      .maybeSingle()

    if (findError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification token' },
        { status: 400 }
      )
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified. You can log in now.',
        already_verified: true
      })
    }

    // Mark email as verified and clear token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_token: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error verifying email:', updateError)
      return NextResponse.json(
        { success: false, message: 'Failed to verify email' },
        { status: 500 }
      )
    }

    // TODO: Send welcome email

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      user: {
        id: user.id,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Error in verify email:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
