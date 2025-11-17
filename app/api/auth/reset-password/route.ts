import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidPassword } from '@/lib/security'
import bcrypt from 'bcryptjs'

/**
 * Reset password with token
 * POST /api/auth/reset-password
 *
 * Body:
 * - token: Reset token from email
 * - newPassword: New password
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Reset token is required' },
        { status: 400 }
      )
    }

    if (!newPassword || !isValidPassword(newPassword)) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Find user with this reset token
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, reset_token_expiry')
      .eq('reset_token', token)
      .maybeSingle()

    if (findError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (user.reset_token_expiry && new Date(user.reset_token_expiry) < new Date()) {
      return NextResponse.json(
        { success: false, message: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expiry: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { success: false, message: 'Failed to reset password' },
        { status: 500 }
      )
    }

    // TODO: Send confirmation email

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    })

  } catch (error) {
    console.error('Error in reset password:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
