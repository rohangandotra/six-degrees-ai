import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, sanitizeHtml, RATE_LIMITS } from '@/lib/security'

/**
 * Create an introduction request
 * POST /api/intros/request
 *
 * Body:
 * - requesterId: User requesting the intro
 * - connectorId: User who will make the intro
 * - targetContactId: Contact ID in connector's network
 * - targetName: Name of person to meet
 * - targetCompany: Company of person to meet
 * - targetPosition: Position of person to meet
 * - targetEmail: Email of person to meet
 * - requestMessage: Why requester wants the intro
 * - contextForConnector: Additional context for connector (optional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      requesterId,
      connectorId,
      targetContactId,
      targetName,
      targetCompany,
      targetPosition,
      targetEmail,
      requestMessage,
      contextForConnector
    } = body

    // Validate required fields
    if (!requesterId || !connectorId || !targetContactId || !targetName || !requestMessage) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Rate limiting: 5 intro requests per hour
    const rateLimit = checkRateLimit(`intro-request:${requesterId}`, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many intro requests. Please try again later.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()

    // Verify connection exists between requester and connector
    const { data: connection } = await supabase
      .from('user_connections')
      .select('id, status')
      .or(`and(user_id.eq.${requesterId},connected_user_id.eq.${connectorId}),and(user_id.eq.${connectorId},connected_user_id.eq.${requesterId})`)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!connection) {
      return NextResponse.json(
        { success: false, message: 'You must be connected to request an introduction' },
        { status: 403 }
      )
    }

    // Create intro request
    const { data: introRequest, error } = await supabase
      .from('intro_requests')
      .insert([{
        requester_id: requesterId,
        connector_id: connectorId,
        target_contact_id: targetContactId,
        target_name: sanitizeHtml(targetName),
        target_company: sanitizeHtml(targetCompany || ''),
        target_position: sanitizeHtml(targetPosition || ''),
        target_email: sanitizeHtml(targetEmail || ''),
        request_message: sanitizeHtml(requestMessage),
        context_for_connector: contextForConnector ? sanitizeHtml(contextForConnector) : null,
        status: 'pending'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating intro request:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to create introduction request' },
        { status: 500 }
      )
    }

    // TODO: Send email notification to connector

    return NextResponse.json({
      success: true,
      message: 'Introduction request sent!',
      requestId: introRequest.id
    })

  } catch (error) {
    console.error('Error in intro request:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
