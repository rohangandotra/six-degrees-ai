import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID, sanitizeHtml } from '@/lib/security'

// GET - Retrieve user profile
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId is required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid userId' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: profile || null
    })

  } catch (error: any) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}

// POST - Create new user profile
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      user_id,
      current_role,
      current_company,
      industry,
      company_stage,
      location_city,
      goals,
      interests,
      seeking_connections,
      privacy_settings
    } = body

    // Validation
    if (!user_id || !current_company) {
      return NextResponse.json(
        { success: false, message: 'user_id and current_company are required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(user_id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user_id' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Profile already exists. Use PUT to update.' },
        { status: 400 }
      )
    }

    // Sanitize text inputs
    const profileData = {
      user_id,
      current_role: current_role ? sanitizeHtml(current_role) : null,
      current_company: sanitizeHtml(current_company),
      industry: industry ? sanitizeHtml(industry) : null,
      company_stage: company_stage ? sanitizeHtml(company_stage) : null,
      location_city: location_city ? sanitizeHtml(location_city) : null,
      goals: goals || [],
      interests: interests || [],
      seeking_connections: seeking_connections || [],
      privacy_settings: privacy_settings || {},
      profile_completed: true,
      created_at: new Date().toISOString()
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to create profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile
    })

  } catch (error: any) {
    console.error('Create profile error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}

// PUT - Update existing user profile
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { user_id, ...updates } = body

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: 'user_id is required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(user_id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user_id' },
        { status: 400 }
      )
    }

    // Sanitize text fields
    const sanitizedUpdates: any = { ...updates }
    if (updates.current_role) sanitizedUpdates.current_role = sanitizeHtml(updates.current_role)
    if (updates.current_company) sanitizedUpdates.current_company = sanitizeHtml(updates.current_company)
    if (updates.industry) sanitizedUpdates.industry = sanitizeHtml(updates.industry)
    if (updates.company_stage) sanitizedUpdates.company_stage = sanitizeHtml(updates.company_stage)
    if (updates.location_city) sanitizedUpdates.location_city = sanitizeHtml(updates.location_city)

    sanitizedUpdates.updated_at = new Date().toISOString()

    const supabase = createAdminClient()

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(sanitizedUpdates)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile
    })

  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
