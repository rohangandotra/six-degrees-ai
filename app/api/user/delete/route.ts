import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        if (!supabase) return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Delete Contacts
        const { error: contactsError } = await adminSupabase
            .from('contacts')
            .delete()
            .eq('user_id', user.id)

        if (contactsError) throw new Error(`Failed to delete contacts: ${contactsError.message}`)

        // 2. Delete Profile
        const { error: profileError } = await adminSupabase
            .from('user_profiles')
            .delete()
            .eq('user_id', user.id)

        if (profileError) throw new Error(`Failed to delete profile: ${profileError.message}`)

        // 3. Delete Auth User
        const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(user.id)

        if (authDeleteError) throw new Error(`Failed to delete auth user: ${authDeleteError.message}`)

        return NextResponse.json({
            success: true,
            message: 'Account and all data permanently deleted'
        })

    } catch (error: any) {
        console.error('Delete account error:', error)
        return NextResponse.json(
            { error: error.message || 'Deletion failed' },
            { status: 500 }
        )
    }
}
