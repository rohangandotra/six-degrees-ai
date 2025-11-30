import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'
import { timingSafeEqual } from 'crypto'

/**
 * Update feedback status (admin only)
 * PUT /api/feedback/update
 *
 * Headers:
 * - Authorization: Bearer <admin_api_key> (required)
 *
 * Body:
 * - feedbackId: Feedback UUID
 * - newStatus: new, reviewed, resolved
 */
export async function PUT(request: Request) {
  try {
    // Get admin key from Authorization header
    const authHeader = request.headers.get('authorization')
    const providedKey = authHeader?.replace('Bearer ', '')?.trim()

    // Admin authentication with constant-time comparison
    const expectedKey = process.env.ADMIN_API_KEY
    if (!providedKey || !expectedKey || providedKey.length !== expectedKey.length) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedKey)
    const expectedBuffer = Buffer.from(expectedKey)

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { feedbackId, newStatus } = body

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
