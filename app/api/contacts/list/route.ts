import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidUUID } from '@/lib/security'

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

    const { data: contacts, error } = await supabase
      .from('user_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch contacts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      contacts: contacts || [],
      count: contacts?.length || 0
    })

  } catch (error: any) {
    console.error('Error listing contacts:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    )
  }
}
