import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'

/**
 * Update feedback status (admin only)
 * PUT /api/feedback/update
 *
 * Body:
 * - feedbackId: Feedback UUID
 * - newStatus: new, reviewed, resolved
 * - adminKey: Admin authentication key
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { feedbackId, newStatus, adminKey } = body

    // Simple admin authentication
    // TODO: Replace with proper admin authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!feedbackId || !isValidUUID(feedbackId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid feedback ID' },
        { status: 400 }
      )
    }

    if (!['new', 'reviewed', 'resolved'].includes(newStatus)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: feedback, error } = await supabase
      .from('feedback')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
      .select()
      .single()

    if (error) {
      console.error('Error updating feedback:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to update feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback status updated',
      feedback
    })

  } catch (error) {
    console.error('Error in update feedback:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
