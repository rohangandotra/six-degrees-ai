import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DOMAIN_TO_COMPANY } from '@/lib/constants/company-domains'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMITS } from '@/lib/security'

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

    // Use authenticated client instead of admin client for security
    // RLS policies must be in place to allow insert/upsert for own rows

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

    // 5. Manual Upsert (Check existing -> Insert/Update)
    // Fetch existing contacts to check for duplicates
    // We only care about linkedin_url for deduplication
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('id, linkedin_url')
      .eq('user_id', userId)
      .not('linkedin_url', 'is', null)

    const existingMap = new Map(
      existingContacts?.map(c => [c.linkedin_url, c.id]) || []
    )

    const toInsert: any[] = []
    const toUpdate: any[] = []

    contactsToInsert.forEach(contact => {
      if (contact.linkedin_url && existingMap.has(contact.linkedin_url)) {
        // Update existing
        toUpdate.push({ ...contact, id: existingMap.get(contact.linkedin_url) })
      } else {
        // Insert new
        toInsert.push(contact)
      }
    })

    // Batch Processing Helper
    const processBatch = async (items: any[], operation: 'insert' | 'upsert') => {
      const BATCH_SIZE = 100
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)

        let error
        if (operation === 'insert') {
          const { error: err } = await supabase.from('contacts').insert(batch)
          error = err
        } else {
          const { error: err } = await supabase.from('contacts').upsert(batch)
          error = err
        }

        if (error) {
          console.error(`Batch ${operation} error (rows ${i}-${i + BATCH_SIZE}):`, error)
          throw new Error(`${operation} failed: ${error.message}`)
        }
      }
    }

    // Perform Inserts in Batches
    if (toInsert.length > 0) {
      console.log(`Inserting ${toInsert.length} new contacts...`)
      await processBatch(toInsert, 'insert')
    }

    // Perform Updates in Batches
    if (toUpdate.length > 0) {
      console.log(`Updating ${toUpdate.length} existing contacts...`)
      await processBatch(toUpdate, 'upsert')
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
