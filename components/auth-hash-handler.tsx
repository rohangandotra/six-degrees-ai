"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

/**
 * Client-side component that handles OAuth hash fragments from Supabase
 * Detects password reset tokens in URL hash and redirects appropriately
 */
export function AuthHashHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    // Check if URL has hash fragment
    const hash = window.location.hash

    if (!hash) return

    // Parse hash parameters
    const params = new URLSearchParams(hash.substring(1)) // Remove the '#'
    const type = params.get("type")
    const accessToken = params.get("access_token")

    // If this is a password recovery link with token
    if (type === "recovery" && accessToken) {
      console.log("🔐 Password recovery detected in hash, redirecting to reset page...")

      // Don't redirect if already on reset password page
      if (pathname !== "/auth/reset-password") {
        // Redirect to reset password page
        // The Supabase client will automatically pick up the session from the hash
        router.push("/auth/reset-password")
      }
    }

    // Handle email confirmation
    if (type === "signup" && accessToken) {
      console.log("✅ Email confirmation detected, redirecting to dashboard...")
      if (pathname !== "/dashboard") {
        router.push("/dashboard")
      }
    }
  }, [router, pathname])

  // This component doesn't render anything
  return null
}
