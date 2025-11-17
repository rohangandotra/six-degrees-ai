import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'
import { checkRateLimit, RATE_LIMITS, isValidEmail, isValidPassword, sanitizeHtml, logSecurityEvent } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, full_name, organization } = body

    // Rate limiting - prevent spam registrations
    const rateLimitId = `register:${email}`
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.auth)

    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        details: `Registration attempt from ${email}`,
        severity: 'medium'
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Too many registration attempts. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Input validation
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
        },
        { status: 400 }
      )
    }

    // Sanitize inputs to prevent XSS
    const sanitizedFullName = sanitizeHtml(full_name)
    const sanitizedOrganization = organization ? sanitizeHtml(organization) : null

    const supabase = createAdminClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Generate verification token
    const verification_token = crypto.randomUUID()

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password_hash,
        full_name: sanitizedFullName,
        organization: sanitizedOrganization,
        email_verified: false,
        verification_token,
        created_at: new Date().toISOString()
      }])
      .select('id, email, full_name')
      .single()

    if (error) {
      console.error('Registration error:', JSON.stringify(error, null, 2))
      console.error('Error details:', error.code, error.message, error.details, error.hint)
      return NextResponse.json(
        { success: false, message: 'Registration failed. Please try again.' },
        { status: 500 }
      )
    }

    // TODO: Send verification email
    // You'll need to implement email sending using your SMTP setup
    // For now, we'll just log the token
    console.log(`Verification token for ${email}: ${verification_token}`)

    logSecurityEvent({
      type: 'user_registered',
      userId: user.id,
      details: `New user registered: ${email}`,
      severity: 'low'
    })

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email for verification.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }
    })

  } catch (error: any) {
    console.error('Registration error:', error)
    logSecurityEvent({
      type: 'registration_error',
      details: error.message,
      severity: 'high'
    })

    return NextResponse.json(
      { success: false, message: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}
