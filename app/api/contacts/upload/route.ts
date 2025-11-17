import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Papa from 'papaparse'
import { checkRateLimit, RATE_LIMITS, isValidUUID, sanitizeCSVCell, logSecurityEvent } from '@/lib/security'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    // Rate limiting
    const rateLimit = checkRateLimit(`upload:${userId}`, RATE_LIMITS.upload)
    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId,
        details: 'CSV upload rate limit exceeded',
        severity: 'medium'
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Upload limit reached. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Validation
    if (!file || !userId) {
      return NextResponse.json(
        { success: false, message: 'File and userId are required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid userId' },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'Only CSV files are allowed' },
        { status: 400 }
      )
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Parse CSV
    const text = await file.text()
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize headers to match our expected format
        const normalized = header.trim().toLowerCase()
        if (normalized.includes('name')) return 'full_name'
        if (normalized.includes('email')) return 'email'
        if (normalized.includes('position') || normalized.includes('title')) return 'position'
        if (normalized.includes('company') || normalized.includes('organization')) return 'company'
        return header
      }
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to parse CSV file',
          errors: parseResult.errors
        },
        { status: 400 }
      )
    }

    // Sanitize and prepare contacts
    const contacts = parseResult.data
      .filter((row: any) => row.full_name || row.email) // Must have at least name or email
      .map((row: any) => ({
        user_id: userId,
        full_name: sanitizeCSVCell(row.full_name || row.Full_Name || row.Name || ''),
        email: sanitizeCSVCell(row.email || row.Email || ''),
        position: sanitizeCSVCell(row.position || row.Position || row.Title || ''),
        company: sanitizeCSVCell(row.company || row.Company || row.Organization || ''),
        created_at: new Date().toISOString()
      }))

    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid contacts found in CSV' },
        { status: 400 }
      )
    }

    // Limit number of contacts (prevent abuse)
    const maxContacts = 10000
    if (contacts.length > maxContacts) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many contacts. Maximum allowed is ${maxContacts}.`
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Delete existing contacts for this user
    await supabase
      .from('user_contacts')
      .delete()
      .eq('user_id', userId)

    // Insert new contacts in batches (Supabase has a limit)
    const batchSize = 1000
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)
      const { error } = await supabase
        .from('user_contacts')
        .insert(batch)

      if (error) {
        console.error('Error inserting contacts batch:', error)
        logSecurityEvent({
          type: 'contact_upload_error',
          userId,
          details: `Failed to insert contacts: ${error.message}`,
          severity: 'high'
        })

        return NextResponse.json(
          { success: false, message: 'Failed to save contacts. Please try again.' },
          { status: 500 }
        )
      }
    }

    logSecurityEvent({
      type: 'contacts_uploaded',
      userId,
      details: `Uploaded ${contacts.length} contacts`,
      severity: 'low'
    })

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${contacts.length} contacts`,
      count: contacts.length
    })

  } catch (error: any) {
    console.error('Contact upload error:', error)
    logSecurityEvent({
      type: 'contact_upload_error',
      details: error.message,
      severity: 'high'
    })

    return NextResponse.json(
      { success: false, message: 'An error occurred while uploading contacts' },
      { status: 500 }
    )
  }
}
