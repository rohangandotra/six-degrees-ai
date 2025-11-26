import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, RATE_LIMITS, isValidUUID, sanitizeHtml, logSecurityEvent } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, targetUserId, message, shareNetwork = true } = body

    // Rate limiting
    const rateLimit = checkRateLimit(`connections:${userId}`, RATE_LIMITS.connections)
    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId,
        details: 'Connection request rate limit exceeded',
        severity: 'medium'
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Too many connection requests. Please slow down.'
        },
        { status: 429 }
      )
    }

    // Validation
    if (!userId || !targetUserId) {
      return NextResponse.json(
        { success: false, message: 'userId and targetUserId are required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(userId) || !isValidUUID(targetUserId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user IDs' },
        { status: 400 }
      )
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { success: false, message: 'Cannot connect with yourself' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if connection already exists (in either direction)
    const { data: existing } = await supabase
      .from('user_connections')
      .select('id, status')
      .or(`and(user_id.eq.${userId},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${userId})`)
      .maybeSingle()

    if (existing) {
      let statusMessage = 'Connection already exists'
      if (existing.status === 'pending') {
        statusMessage = 'Connection request already pending'
      } else if (existing.status === 'accepted') {
        statusMessage = 'You are already connected with this user'
      }

      return NextResponse.json(
        { success: false, message: statusMessage },
        { status: 400 }
      )
    }

    // Sanitize message
    const sanitizedMessage = message ? sanitizeHtml(message) : null

    // Create connection request
    const { data: connection, error } = await supabase
      .from('user_connections')
      .insert([{
        user_id: userId,
        connected_user_id: targetUserId,
        status: 'pending',
        request_message: sanitizedMessage,
        requester_shares_network: shareNetwork,
        accepter_shares_network: true, // Default for accepter
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating connection:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to send connection request' },
        { status: 500 }
      )
    }

    logSecurityEvent({
      type: 'connection_request_sent',
      userId,
      details: `Sent connection request to ${targetUserId}`,
      severity: 'low'
    })

    // Send email notification to target user
    const { data: targetUser } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', targetUserId)
      .single()

    const { data: requester } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single()

    if (targetUser && targetUser.email && requester) {
      const { sendEmail, getConnectionRequestTemplate } = await import('@/lib/email')
      const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sixthdegree.app'}/dashboard/network`

      await sendEmail({
        to: targetUser.email,
        subject: `New Connection Request from ${requester.full_name}`,
        html: getConnectionRequestTemplate(requester.full_name, acceptUrl)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Connection request sent successfully',
      connection_id: connection.id
    })

  } catch (error: any) {
    console.error('Send connection request error:', error)
    logSecurityEvent({
      type: 'connection_request_error',
      details: error.message,
      severity: 'high'
    })

    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
