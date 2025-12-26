import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeHtml, checkRateLimit } from '@/lib/security'
import OpenAI from 'openai'
import { sendEmail } from '@/lib/email'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Admin email for urgent notifications
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'rohan@sixthdegree.app'

interface AIAnalysis {
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  summary: string
}

/**
 * Analyze feedback using OpenAI to determine severity and category
 */
async function analyzeFeedback(feedbackText: string): Promise<AIAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a feedback analyzer for a professional networking app called Sixth Degree. 
Analyze user feedback and return a JSON object with:
- severity: "low" (minor suggestion), "medium" (normal feedback), "high" (significant issue affecting usability), "critical" (app-breaking bug, data loss, security issue)
- category: One of "bug", "feature", "usability", "performance", "security", "praise", "other"
- summary: A one-line summary (max 100 chars) of the feedback

Be conservative with "critical" - only use for genuinely urgent issues like crashes, data loss, or security vulnerabilities.
Return ONLY valid JSON, no markdown.`
        },
        {
          role: 'user',
          content: feedbackText
        }
      ],
      temperature: 0.3,
      max_tokens: 150,
    })

    const content = response.choices[0]?.message?.content || ''
    const parsed = JSON.parse(content)

    return {
      severity: parsed.severity || 'medium',
      category: parsed.category || 'other',
      summary: parsed.summary || feedbackText.slice(0, 100)
    }
  } catch (error) {
    console.error('Error analyzing feedback with AI:', error)
    // Fallback to defaults if AI fails
    return {
      severity: 'medium',
      category: 'other',
      summary: feedbackText.slice(0, 100)
    }
  }
}

/**
 * Send urgent notification email for high/critical feedback
 */
async function sendUrgentNotification(feedback: {
  id: string
  feedbackText: string
  severity: string
  category: string
  summary: string
  userEmail?: string
  pageContext?: string
}) {
  const severityEmoji = feedback.severity === 'critical' ? '🚨' : '⚠️'

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${severityEmoji} ${feedback.severity.toUpperCase()} Feedback Alert</h2>
      <p><strong>Summary:</strong> ${feedback.summary}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
      <p><strong>Category:</strong> ${feedback.category}</p>
      <p><strong>Page:</strong> ${feedback.pageContext || 'Unknown'}</p>
      <p><strong>User:</strong> ${feedback.userEmail || 'Anonymous'}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
      <p><strong>Full Feedback:</strong></p>
      <blockquote style="background: #f9f9f9; padding: 12px; border-left: 3px solid #0070f3; margin: 0;">
        ${feedback.feedbackText}
      </blockquote>
      <p style="margin-top: 16px; color: #666; font-size: 14px;">
        Feedback ID: ${feedback.id}
      </p>
    </div>
  `

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `${severityEmoji} [${feedback.severity.toUpperCase()}] User Feedback: ${feedback.summary}`,
    html
  })
}

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
 * - posthogSessionId: PostHog session ID for replay (optional)
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
      posthogSessionId = null,
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

    // Analyze feedback with AI
    const analysis = await analyzeFeedback(feedbackText)

    const supabase = createAdminClient()

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert([{
        feedback_text: sanitizeHtml(feedbackText),
        feedback_type: feedbackType,
        page_context: pageContext,
        user_id: userId,
        user_email: userEmail ? sanitizeHtml(userEmail) : null,
        posthog_session_id: posthogSessionId,
        severity: analysis.severity,
        category: analysis.category,
        ai_summary: analysis.summary,
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

    // Send notification for high/critical severity
    if (analysis.severity === 'high' || analysis.severity === 'critical') {
      try {
        await sendUrgentNotification({
          id: feedback.id,
          feedbackText,
          severity: analysis.severity,
          category: analysis.category,
          summary: analysis.summary,
          userEmail,
          pageContext
        })

        // Mark as notified
        await supabase
          .from('feedback')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', feedback.id)
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError)
        // Don't fail the request if notification fails
      }
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
