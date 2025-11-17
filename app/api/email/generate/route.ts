import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { checkRateLimit, RATE_LIMITS, isValidUUID, sanitizeHtml, logSecurityEvent } from '@/lib/security'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, contacts, purpose, tone, context } = body

    // Rate limiting
    const rateLimit = checkRateLimit(`email:${userId}`, RATE_LIMITS.emailGen)
    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId,
        details: 'Email generation rate limit exceeded',
        severity: 'medium'
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Too many email generation requests. Please slow down.'
        },
        { status: 429 }
      )
    }

    // Validation
    if (!userId || !contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'userId and contacts are required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid userId' },
        { status: 400 }
      )
    }

    if (contacts.length > 10) {
      return NextResponse.json(
        { success: false, message: 'Maximum 10 contacts per email' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const sanitizedPurpose = purpose ? sanitizeHtml(purpose) : 'networking'
    const sanitizedTone = tone ? sanitizeHtml(tone) : 'professional'
    const sanitizedContext = context ? sanitizeHtml(context) : ''

    // Build contact list
    const contactList = contacts.map((c: any) =>
      `- ${sanitizeHtml(c.name || 'Unknown')} (${sanitizeHtml(c.position || 'Position unknown')}, ${sanitizeHtml(c.company || 'Company unknown')})`
    ).join('\n')

    // Build prompt for OpenAI
    const prompt = `You are an expert email writer helping with professional outreach.

Purpose: ${sanitizedPurpose}
Tone: ${sanitizedTone}
Additional Context: ${sanitizedContext || 'None'}

Contacts:
${contactList}

Write a professional email that:
1. Has a compelling subject line
2. Opens with a relevant connection or reason for reaching out
3. Clearly states the purpose
4. Is concise (under 200 words)
5. Ends with a clear call to action
6. Sounds ${sanitizedTone} but genuine

Return ONLY the email in this format:
Subject: [subject line]

[email body]`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional email writing assistant. Write concise, effective emails.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const generatedEmail = completion.choices[0].message.content || ''

    // Parse subject and body
    const subjectMatch = generatedEmail.match(/Subject:\s*(.+?)(?:\n|$)/i)
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Professional Introduction'

    const bodyStart = generatedEmail.indexOf('\n\n')
    const body = bodyStart > 0 ? generatedEmail.substring(bodyStart).trim() : generatedEmail

    // Estimate cost (rough)
    const inputTokens = prompt.length / 4 // Rough estimate
    const outputTokens = generatedEmail.length / 4
    const costEstimate = ((inputTokens * 0.00015) + (outputTokens * 0.0006)) / 1000

    logSecurityEvent({
      type: 'email_generated',
      userId,
      details: `Generated email for ${contacts.length} contacts, cost: $${costEstimate.toFixed(4)}`,
      severity: 'low'
    })

    return NextResponse.json({
      success: true,
      subject,
      body,
      cost_estimate: costEstimate
    })

  } catch (error: any) {
    console.error('Email generation error:', error)
    logSecurityEvent({
      type: 'email_generation_error',
      details: error.message,
      severity: 'high'
    })

    // Check for OpenAI API errors
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { success: false, message: 'OpenAI API quota exceeded. Please contact support.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to generate email. Please try again.' },
      { status: 500 }
    )
  }
}
