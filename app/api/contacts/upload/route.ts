import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DOMAIN_TO_COMPANY } from '@/lib/constants/company-domains'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'
import OpenAI from 'openai'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function generateEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('Embedding generation failed:', error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    // 1. Verify Session
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Database connection failed' },
        { status: 500 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Rate Limit Check
    const rateLimit = checkRateLimit(userId, RATE_LIMITS.upload)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.resetTime },
        { status: 429 }
      )
    }

    // 2. Parse Request Body (JSON)
    const body = await request.json()
    let contactsToInsert = body.contacts

    if (!contactsToInsert || !Array.isArray(contactsToInsert)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: contacts array required' },
        { status: 400 }
      )
    }

    // Add user_id to each contact and ensure full_name is constructed
    contactsToInsert = contactsToInsert.map((contact: any) => {
      const newContact = { ...contact, user_id: userId };
      if (!newContact.full_name && newContact.first_name && newContact.last_name) {
        newContact.full_name = `${newContact.first_name} ${newContact.last_name}`.trim();
      } else if (!newContact.full_name && newContact.first_name) {
        newContact.full_name = newContact.first_name;
      }
      return newContact;
    }).filter((c: any) => c.full_name); // Filter out empty rows based on full_name

    // Enrich contacts (Company from Domain) and Sanitize connected_on
    contactsToInsert.forEach((contact: any) => {
      // Basic Email Enrichment (Company from Domain)
      if (!contact.company && contact.email && contact.email.includes('@')) {
        const domain = contact.email.split('@')[1].toLowerCase()

        if (DOMAIN_TO_COMPANY[domain]) {
          contact.company = DOMAIN_TO_COMPANY[domain]
        } else if (DOMAIN_TO_COMPANY[domain] === undefined) {
          // Unknown domain, try to capitalize
          const companyName = domain.split('.')[0]
          if (companyName) {
            contact.company = companyName.charAt(0).toUpperCase() + companyName.slice(1)
          }
        }
      }

      // Sanitize connected_on
      if (contact.connected_on) {
        const date = new Date(contact.connected_on)
        if (!isNaN(date.getTime())) {
          contact.connected_on = date.toISOString()
        } else {
          contact.connected_on = null // Invalid date, set to null
        }
      }
    })

    // Helper to process embeddings and DB operations
    const processWithEmbeddings = async (items: any[], operation: 'insert' | 'upsert') => {
      const BATCH_SIZE = 50 // Smaller batch size due to embedding latency

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)

        // Generate embeddings in parallel for the batch (Wait! Only if needed)
        const enrichedBatch = await Promise.all(batch.map(async (contact) => {
          // Optimization: Check if we really need to generate an embedding
          // For NEW contacts (insert), yes always.
          // For UPDATED contacts (upsert), only if fields changed.

          let needsEmbedding = true;

          if (operation === 'upsert' && contact.id) {
            // Find existing contact data to compare
            // Note: We might want to fetch this earlier in bulk if performance is critical,
            // but for now, since we only have IDs in 'toUpdate', we rely on what we fetched before?
            // Wait, 'existingMap' only has ID. We didn't fetch the semantic fields.
            // To do this strictly, we need to fetch the existing semantic fields.
            // Given the complexity of re-fetching, and that 'toUpdate' might be large,
            // let's assume we re-embed on update for now to be safe, OR we implement a hash check.

            // Actually, let's look at what we have.
            // If the user is just syncing the same list, the incoming data matches the existing data.
            // If we fetch existing data (name, company, position) we can compare.
          }

          // Let's implement the fetching optimization in the main flow before calling this helper.
          // See logic change below outside this helper.

          const textToEmbed = `
            Name: ${contact.full_name}
            Role: ${contact.position || 'Unknown'}
            Company: ${contact.company || 'Unknown'}
            Email: ${contact.email || ''}
          `.trim()

          // If the contact already has an embedding passed in (from optimization step), use it.
          if (contact.embedding !== undefined) return contact;

          const embedding = await generateEmbedding(textToEmbed)
          return { ...contact, embedding }
        }))

        let error
        if (operation === 'insert') {
          const { error: err } = await supabase.from('contacts').insert(enrichedBatch)
          error = err
        } else {
          const { error: err } = await supabase.from('contacts').upsert(enrichedBatch)
          error = err
        }

        if (error) {
          console.error(`Batch ${operation} error:`, error)
          throw new Error(`${operation} failed: ${error.message}`)
        }
      }
    }

    // REFLECTION: To do the 'Smart Diff', we need the existing data.
    // Update fetch to get ALL contacts for checking duplicates by name too.
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id, linkedin_url, full_name, company, position, embedding')
      .eq('user_id', userId)

    // Primary Map: LinkedIn URL
    const existingMap = new Map(
      existingContacts?.filter(c => c.linkedin_url).map(c => [c.linkedin_url, c]) || []
    )

    // Secondary Map: Normalized Name (Fallback)
    const nameMap = new Map(
      existingContacts?.filter(c => c.full_name).map(c => [c.full_name.trim().toLowerCase(), c]) || []
    )

    const toInsert: any[] = []
    const toUpdate: any[] = []
    const toUpdateWithoutEmbeddingChange: any[] = []

    contactsToInsert.forEach((contact: any) => {
      let existing = null;

      // 1. Try LinkedIn Match
      if (contact.linkedin_url && existingMap.has(contact.linkedin_url)) {
        existing = existingMap.get(contact.linkedin_url);
      }
      // 2. Try Name Match (Fallback)
      else if (contact.full_name) {
        const key = contact.full_name.trim().toLowerCase();
        if (nameMap.has(key)) {
          existing = nameMap.get(key);
        }
      }

      if (existing) {
        // Found existing contact! check for updates.

        // Smart Diff Check
        const nameChanged = (contact.full_name || '') !== (existing.full_name || '');
        const titleChanged = (contact.position || '') !== (existing.position || '');
        const companyChanged = (contact.company || '') !== (existing.company || '');
        const hasEmbedding = !!existing.embedding;

        // Check if we found it by Name but incoming has LinkedIn (Enrichment)
        const newLinkedIn = contact.linkedin_url && !existing.linkedin_url;

        // If semantic fields match and we have an embedding, SKIP generation.
        if (!nameChanged && !titleChanged && !companyChanged && hasEmbedding && !newLinkedIn) {
          // Pass existing embedding back to avoid generation
          toUpdate.push({ ...contact, id: existing.id, embedding: existing.embedding })
        } else {
          // Needs update (either semantic change or new LinkedIn linked)
          toUpdate.push({ ...contact, id: existing.id })
        }
      } else {
        toInsert.push(contact)
      }
    })

    // Perform Inserts
    if (toInsert.length > 0) {
      console.log(`Inserting ${toInsert.length} new contacts with embeddings...`)
      await processWithEmbeddings(toInsert, 'insert')
    }

    // Perform Updates
    if (toUpdate.length > 0) {
      console.log(`Updating ${toUpdate.length} existing contacts...`)
      await processWithEmbeddings(toUpdate, 'upsert')
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${contactsToInsert.length} contacts (${toInsert.length} new, ${toUpdate.length} updated)`,
      num_contacts: contactsToInsert.length,
      preview: contactsToInsert.slice(0, 5)
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
