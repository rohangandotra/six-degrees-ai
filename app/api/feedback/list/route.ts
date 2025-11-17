import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get all feedback submissions (admin only)
 * GET /api/feedback/list?status=new&limit=100
 *
 * Query params:
 * - status: Filter by status (new, reviewed, resolved) - optional
 * - limit: Max results (default: 100)
 * - adminKey: Admin authentication key (required)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const adminKey = searchParams.get('adminKey')

    // Simple admin authentication
    // TODO: Replace with proper admin authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

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
