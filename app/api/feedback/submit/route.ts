import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeHtml, checkRateLimit } from '@/lib/security'

/**
 * Submit user feedback
 * POST /api/feedback/submit
 *
 * Body:
 * - feedbackText: The feedback message (required)
 * - feedbackType: Type of feedback (bug, feature, general, praise)
 * - pageContext: Which page user was on (optional)
 * - userId: User ID if authenticated (optional)
 * - userEmail: User email if provided (optional)
 * - metadata: Additional context (optional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      feedbackText,
      feedbackType = 'general',
      pageContext = 'unknown',
      userId = null,
      userEmail = null,
      metadata = {}
    } = body

    // Validation
    if (!feedbackText || feedbackText.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please enter your feedback' },
        { status: 400 }
      )
    }

    if (feedbackText.length > 5000) {
      return NextResponse.json(
        { success: false, message: 'Feedback is too long (max 5000 characters)' },
        { status: 400 }
      )
    }

    if (!['bug', 'feature', 'general', 'praise'].includes(feedbackType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid feedback type' },
        { status: 400 }
      )
    }

    // Rate limiting: 5 feedback submissions per hour per user/email
    const rateLimitKey = userId || userEmail || 'anonymous'
    const rateLimit = checkRateLimit(`feedback:${rateLimitKey}`, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many feedback submissions. Please try again later.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert([{
        feedback_text: sanitizeHtml(feedbackText),
        feedback_type: feedbackType,
        page_context: pageContext,
        user_id: userId,
        user_email: userEmail ? sanitizeHtml(userEmail) : null,
        metadata: metadata,
        status: 'new',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Error submitting feedback:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to submit feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your feedback has been submitted.',
      feedbackId: feedback.id
    })

  } catch (error) {
    console.error('Error in submit feedback:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
