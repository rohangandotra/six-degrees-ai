import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const type = requestUrl.searchParams.get('type')

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, error_description)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(error_description || error)}`
    )
  }

  // Exchange the code for a session
  if (code) {
    const supabase = await createClient()

    if (supabase) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`
        )
      }
    }

    // Redirect based on type
    if (type === 'recovery') {
      // Password reset - redirect to reset password page
      return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password`)
    }

    // Check if user has completed onboarding
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // SELF-HEALING: Ensure user exists in public.users
      // This handles cases where the DB trigger failed (e.g. due to password_hash constraint)
      try {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const adminSupabase = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: existingUser } = await adminSupabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingUser) {
          console.log('[Auth Callback] User missing in public.users, syncing now:', user.id)
          const { error: syncError } = await adminSupabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              password_hash: 'managed_by_supabase_auth' // Dummy value to satisfy legacy constraint
            })

          if (syncError) {
            console.error('[Auth Callback] Failed to sync user:', syncError)
          } else {
            console.log('[Auth Callback] User synced successfully')
          }
        }
      } catch (err) {
        console.error('[Auth Callback] Error in self-healing:', err)
      }

      const profileResponse = await fetch(`${requestUrl.origin}/api/profile?userId=${user.id}`)
      const profileData = await profileResponse.json()

      // If no profile or profile not completed, redirect to onboarding
      if (!profileData.success || !profileData.profile || !profileData.profile.profile_completed) {
        return NextResponse.redirect(`${requestUrl.origin}/onboarding`)
      }
    }

    // Default: redirect to dashboard for successful auth
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  }

  // No code present, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
}
