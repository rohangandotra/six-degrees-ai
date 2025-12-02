import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        if (!supabase) return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Use Admin Client to fetch all data (bypassing RLS if needed, though RLS should allow read own data)
        // Using admin client ensures we get everything regardless of RLS quirks for export
        const adminSupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Fetch Profile
        const { data: profile } = await adminSupabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

        // 2. Fetch Contacts
        const { data: contacts } = await adminSupabase
            .from('contacts')
            .select('*')
            .eq('user_id', user.id)

        // 3. Construct Export Object
        const exportData = {
            user: {
                id: user.id,
                email: user.email,
                ...profile
            },
            contacts: contacts || [],
            export_date: new Date().toISOString()
        }

        // 4. Return as JSON file
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="six_degrees_export_${user.id}.json"`
            }
        })

    } catch (error: any) {
        console.error('Export error:', error)
        return NextResponse.json(
            { error: error.message || 'Export failed' },
            { status: 500 }
        )
    }
}
