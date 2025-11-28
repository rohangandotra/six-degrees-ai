import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const apiKey = request.headers.get('x-api-key')

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API Key' }, { status: 401 })
        }

        // Verify user exists (API Key is User ID for MVP)
        const supabase = await createClient()

        // We need to use admin client to verify if this ID exists in public.users without being logged in as them
        // But wait, createClient() uses cookies. The extension request won't have cookies.
        // So we MUST use the Service Role key to verify the ID.

        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminSupabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: user, error: userError } = await adminSupabase
            .from('users')
            .select('id')
            .eq('id', apiKey)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
        }

        const { contacts } = await request.json()

        if (!contacts || !Array.isArray(contacts)) {
            return NextResponse.json({ error: 'Invalid contacts data' }, { status: 400 })
        }

        console.log(`[Sync] Received ${contacts.length} contacts for user ${user.id}`)

        let successCount = 0
        let errorCount = 0

        // Process contacts
        for (const contact of contacts) {
            try {
                // Basic deduplication logic
                // 1. Check if contact exists by LinkedIn URL or Name
                // For MVP, let's just insert/ignore or basic check

                // We need to map the extension data to our schema
                // Extension sends: { name, headline, profileUrl, avatarUrl, connectedAt, source }

                // Parse name
                const nameParts = contact.name.split(' ')
                const first_name = nameParts[0]
                const last_name = nameParts.slice(1).join(' ') || ''

                // Check existing in contacts table
                const { data: existing } = await adminSupabase
                    .from('contacts')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('linkedin_url', contact.profileUrl)
                    .single()

                if (existing) {
                    // Update existing contact
                    await adminSupabase
                        .from('contacts')
                        .update({
                            position: contact.headline,
                            avatar_url: contact.avatarUrl,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id)

                    successCount++
                } else {
                    // Insert new contact
                    const { error: insertError } = await adminSupabase
                        .from('contacts')
                        .insert({
                            user_id: user.id,
                            first_name,
                            last_name,
                            full_name: contact.name,
                            company: '', // We don't extract company cleanly yet
                            position: contact.headline,
                            linkedin_url: contact.profileUrl,
                            avatar_url: contact.avatarUrl,
                            source: 'linkedin_extension',
                            email: '', // Email is not scraped
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })

                    if (insertError) {
                        console.error('Insert error:', insertError)
                        errorCount++
                    } else {
                        successCount++
                    }
                }
            } catch (err) {
                console.error('Processing error:', err)
                errorCount++
            }
        }

        return NextResponse.json({
            success: true,
            count: successCount,
            errors: errorCount
        })

    } catch (error) {
        console.error('Sync API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
