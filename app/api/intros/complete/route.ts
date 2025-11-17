import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'

/**
 * Mark introduction request as completed
 * PUT /api/intros/complete
 *
 * Body:
 * - requestId: ID of intro request to mark complete
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { requestId } = body

    if (!requestId || !isValidUUID(requestId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request ID' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: introRequest, error } = await supabase
      .from('intro_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error completing intro request:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to mark introduction as completed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Introduction marked as completed!',
      request: introRequest
    })

  } catch (error) {
    console.error('Error in complete intro request:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
