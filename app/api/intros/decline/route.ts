import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeHtml, isValidUUID } from '@/lib/security'

/**
 * Decline an introduction request
 * POST /api/intros/decline
 *
 * Body:
 * - requestId: ID of intro request to decline
 * - reason: Reason for declining
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { requestId, reason } = body

    if (!requestId || !isValidUUID(requestId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request ID' },
        { status: 400 }
      )
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please provide a reason for declining' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: introRequest, error } = await supabase
      .from('intro_requests')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
        response_message: sanitizeHtml(reason)
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error declining intro request:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to decline introduction request' },
        { status: 500 }
      )
    }

    // TODO: Send email notification to requester

    return NextResponse.json({
      success: true,
      message: 'Introduction request declined',
      request: introRequest
    })

  } catch (error) {
    console.error('Error in decline intro request:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
