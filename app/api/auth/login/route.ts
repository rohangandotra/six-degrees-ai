import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'
import { checkRateLimit, RATE_LIMITS, isValidEmail, logSecurityEvent } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Rate limiting - prevent brute force attacks
    const rateLimitId = `login:${email}`
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.auth)

    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        details: `Login attempt for ${email}`,
        severity: 'high'
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Too many login attempts. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !user) {
      logSecurityEvent({
        type: 'login_failed',
        details: `Failed login attempt for ${email} - user not found`,
        severity: 'low'
      })

      // Don't reveal whether user exists
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash)

    if (!passwordValid) {
      logSecurityEvent({
        type: 'login_failed',
        userId: user.id,
        details: `Failed login attempt - invalid password`,
        severity: 'medium'
      })

      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!user.email_verified) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please verify your email before logging in',
          needsVerification: true
        },
        { status: 403 }
      )
    }

    // Successful login - remove password hash before returning
    const { password_hash, verification_token, reset_token, ...userWithoutSensitiveData } = user

    logSecurityEvent({
      type: 'login_success',
      userId: user.id,
      details: `User logged in successfully`,
      severity: 'low'
    })

    return NextResponse.json({
      success: true,
      user: userWithoutSensitiveData
    })

  } catch (error: any) {
    console.error('Login error:', error)
    logSecurityEvent({
      type: 'login_error',
      details: error.message,
      severity: 'high'
    })

    return NextResponse.json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
