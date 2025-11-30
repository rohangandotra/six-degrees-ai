import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { timingSafeEqual } from 'crypto'

/**
 * Get all feedback submissions (admin only)
 * GET /api/feedback/list?status=new&limit=100
 *
 * Headers:
 * - Authorization: Bearer <admin_api_key> (required)
 *
 * Query params:
 * - status: Filter by status (new, reviewed, resolved) - optional
 * - limit: Max results (default: 100)
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    const supabase = createAdminClient()

    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by status if provided
    if (status && ['new', 'reviewed', 'resolved'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: feedback, error } = await query

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      feedback: feedback || [],
      count: feedback?.length || 0
    })

  } catch (error) {
    console.error('Error in list feedback:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
