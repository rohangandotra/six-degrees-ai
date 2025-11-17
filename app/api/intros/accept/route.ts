import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeHtml, isValidUUID } from '@/lib/security'

/**
 * Accept an introduction request
 * POST /api/intros/accept
 *
 * Body:
 * - requestId: ID of intro request to accept
 * - connectorNotes: Optional notes from connector (optional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { requestId, connectorNotes } = body

    if (!requestId || !isValidUUID(requestId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Build update data
    const updateData: any = {
      status: 'accepted',
      responded_at: new Date().toISOString()
    }

    if (connectorNotes) {
      updateData.response_message = sanitizeHtml(connectorNotes)
    }

    const { data: introRequest, error } = await supabase
      .from('intro_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error accepting intro request:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to accept introduction request' },
        { status: 500 }
      )
    }

    // TODO: Send email notification to requester

    return NextResponse.json({
      success: true,
      message: 'Introduction request accepted!',
      request: introRequest
    })

  } catch (error) {
    console.error('Error in accept intro request:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
