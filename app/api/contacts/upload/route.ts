import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS, isValidUUID, logSecurityEvent } from '@/lib/security'
import { createClient } from '@/lib/supabase/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    // 1. Verify Session (Authentication)
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Database configuration error' },
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
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File is required' },
        { status: 400 }
      )
    }

    // Proxy to Python Backend
    try {
      // Create a new FormData for the proxy request
      const proxyFormData = new FormData()
      proxyFormData.append('file', file)
      // Note: Python backend expects 'file' and 'user_id' in header, or maybe just file?
      // Looking at api_server.py: upload_contacts(file: UploadFile, user_id: str = Depends(get_current_user_id))
      // So we need to send file in body, and user_id in Header.

      const headers: any = {
        'X-User-ID': userId
      }

      if (INTERNAL_API_KEY) {
        headers['X-Internal-Key'] = INTERNAL_API_KEY
      }

      const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/api/contacts/upload`, {
        method: 'POST',
        headers,
        body: proxyFormData
      })

      if (!pythonResponse.ok) {
        const errorText = await pythonResponse.text()
        console.error('Python backend error:', errorText)
        throw new Error(`Python backend returned ${pythonResponse.status}: ${errorText}`)
      }

      const data = await pythonResponse.json()

      logSecurityEvent({
        type: 'contacts_uploaded',
        userId,
        details: `Uploaded ${data.num_contacts} contacts (via Python)`,
        severity: 'low'
      })

      return NextResponse.json(data)

    } catch (error: any) {
      console.error('Python backend connection error:', error)

      return NextResponse.json(
        {
          success: false,
          message: 'Upload service unavailable. Please ensure the backend is running.'
        },
        { status: 503 }
      )
    }

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
