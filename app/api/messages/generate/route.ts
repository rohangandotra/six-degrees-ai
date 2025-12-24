import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

interface GenerateRequest {
    contact: {
        full_name: string
        position?: string
        company?: string
    }
    connector?: {
        full_name: string
        position?: string
        company?: string
    } | null
    user?: {
        full_name: string
        position?: string
        company?: string
    }
    purpose: string
    angle: string
    messagePath: 'direct' | 'intro'
}

const PURPOSE_CONTEXT: Record<string, string> = {
    any: "general networking",
    raise_funds: "fundraising for their startup",
    hire_talent: "hiring for their team",
    find_mentors: "seeking mentorship and guidance",
    explore_partnerships: "exploring potential partnerships",
}

const ANGLE_CONTEXT: Record<string, string> = {
    explore_investment: "to explore investment opportunities",
    get_advice: "to get advice and guidance",
    learn_experience: "to learn from their experience",
    discuss_role: "to discuss a potential role",
    get_referrals: "to get referrals for candidates",
    learn_hiring: "to understand their hiring approach",
    seek_guidance: "to seek career guidance",
    learn_path: "to learn about their career path",
    explore_collab: "to explore collaboration opportunities",
    discuss_synergies: "to discuss potential synergies",
    learn_company: "to learn more about their company",
    connect: "to simply connect and chat",
    learn_more: "to learn more about what they do",
    explore_mutual: "to explore mutual interests",
}

export async function POST(request: Request) {
    try {
        // Verify session
        const supabase = await createClient()
        if (!supabase) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body: GenerateRequest = await request.json()
        const { contact, connector, user, purpose, angle, messagePath } = body

        // Build the prompt based on message path
        const purposeText = PURPOSE_CONTEXT[purpose] || "networking"
        const angleText = ANGLE_CONTEXT[angle] || "to connect"

        const userName = user?.full_name?.split(' ')[0] || 'there'
        const contactFirstName = contact.full_name.split(' ')[0]
        const connectorFirstName = connector?.full_name?.split(' ')[0]

        let systemPrompt: string
        let userPrompt: string

        if (messagePath === 'intro' && connector) {
            // Intro request to connector
            systemPrompt = `You are helping write a brief, genuine message requesting an introduction. 

Rules:
- Keep it under 80 words
- Sound like a real person, not a template
- Be direct but polite
- Mention WHY you want the intro (give context)
- Make it easy to say yes or no
- Don't use phrases like "I hope this message finds you well" or "I wanted to reach out"
- Don't be sycophantic or overly formal
- End with a soft ask, not a demand`

            userPrompt = `Write a message from ${user?.full_name || 'me'} to ${connector.full_name} asking for an introduction to ${contact.full_name}.

Context:
- ${contact.full_name} works as ${contact.position || 'a professional'} at ${contact.company || 'their company'}
- The sender is interested in ${purposeText}
- Specifically, they want ${angleText}
- ${connector.full_name} is a mutual connection

Keep it short, genuine, and make it easy for ${connectorFirstName} to help or decline gracefully.`

        } else {
            // Direct message to contact
            systemPrompt = `You are helping write a brief, genuine outreach message.

Rules:
- Keep it under 80 words
- Sound like a real person, not a sales pitch
- Be direct and specific about why you're reaching out
- If there's a mutual connection, mention them naturally (not as a name-drop)
- Don't use phrases like "I hope this message finds you well" or "I came across your profile"
- Don't be sycophantic
- End with an easy, low-commitment ask`

            const connectionContext = connector
                ? `They share a mutual connection through ${connector.full_name}.`
                : ''

            userPrompt = `Write a message from ${user?.full_name || 'me'} to ${contact.full_name}.

Context:
- ${contact.full_name} works as ${contact.position || 'a professional'} at ${contact.company || 'their company'}
- The sender is interested in ${purposeText}
- Specifically, they want ${angleText}
${connectionContext}

Keep it genuine, direct, and conversational.`
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 300,
        })

        const message = completion.choices[0]?.message?.content?.trim() || ''

        return NextResponse.json({ message })

    } catch (error: any) {
        console.error('Message generation error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate message' },
            { status: 500 }
        )
    }
}
