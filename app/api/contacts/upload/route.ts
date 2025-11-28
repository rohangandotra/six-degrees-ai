import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'
import { DOMAIN_TO_COMPANY } from '@/lib/constants/company-domains'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File is required' },
        { status: 400 }
      )
    }

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

    // 2. Read File Content
    const fileContent = await file.text()

    // 3. Parse CSV (Intelligent Header Detection)
    // First, parse without headers to find the header row
    const initialParse = Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true,
      preview: 20 // Check first 20 lines
    })

    let headerRowIndex = 0
    const linkedinIndicators = ['first name', 'last name', 'company', 'position', 'email']

    // Find the row that looks like headers
    for (let i = 0; i < initialParse.data.length; i++) {
      const row = initialParse.data[i] as string[]
      const rowString = row.join(' ').toLowerCase()
      const matches = linkedinIndicators.filter(indicator => rowString.includes(indicator)).length

      if (matches >= 2) {
        headerRowIndex = i
        break
      }
    }

    // Re-parse with correct header row
    // We need to slice the content string to start from the header row if it's not 0
    // But PapaParse doesn't support 'skipRows' easily with string input in the same way as stream
    // So we'll just parse everything and slice the array if needed, or use the 'transform' config?
    // Actually, simpler: just parse everything with headers: false, then slice the array and map manually.

    const fullParse = Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true
    })

    if (fullParse.errors.length > 0 && fullParse.data.length === 0) {
      throw new Error(`CSV Parsing Error: ${fullParse.errors[0].message}`)
    }

    const allRows = fullParse.data as string[][]
    if (allRows.length <= headerRowIndex + 1) {
      throw new Error("CSV file appears to be empty or missing data")
    }

    const headers = allRows[headerRowIndex].map(h => h.trim().toLowerCase())
    const dataRows = allRows.slice(headerRowIndex + 1)

    // 4. Map Columns
    const columnMapping: Record<string, string> = {
      'first name': 'first_name',
      'last name': 'last_name',
      'company': 'company',
      'position': 'position',
      'title': 'position',
      'email address': 'email',
      'email': 'email',
      'connected on': 'connected_on',
      'url': 'linkedin_url',
      'profile url': 'linkedin_url'
    }

    const contactsToInsert = dataRows.map(row => {
      const contact: any = { user_id: userId }

      headers.forEach((header, index) => {
        const mappedKey = columnMapping[header] || header // Use mapped key or original if no map
        // Only keep keys we care about (simple sanitization)
        if (['first_name', 'last_name', 'company', 'position', 'email', 'connected_on', 'linkedin_url'].includes(mappedKey)) {
          contact[mappedKey] = row[index]?.trim() || null
        }
      })

      // Construct full_name
      if (contact.first_name && contact.last_name) {
        contact.full_name = `${contact.first_name} ${contact.last_name}`.trim()
      } else if (contact.first_name) {
        contact.full_name = contact.first_name
      }

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

      return contact
    }).filter(c => c.full_name) // Filter out empty rows

    // 5. Insert into Database
    if (contactsToInsert.length === 0) {
      return NextResponse.json({ success: true, message: "No valid contacts found to import", num_contacts: 0 })
    }

    const { error: insertError } = await supabase
      .from('contacts')
      .insert(contactsToInsert)

    if (insertError) {
      console.error('Database Insert Error:', insertError)
      throw new Error(insertError.message)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${contactsToInsert.length} contacts`,
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
