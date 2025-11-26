"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Check if user has a valid recovery session
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()

      if (!supabase) {
        toast({
          title: "Configuration error",
          description: "Unable to connect to authentication service.",
          variant: "destructive",
        })
        setIsCheckingAuth(false)
        return
      }

      // First check if we have an active session
      const { data: { session: existingSession } } = await supabase.auth.getSession()

      if (existingSession) {
        setHasValidSession(true)
        setIsCheckingAuth(false)
        return
      }

      // If no session, check for hash fragment (recovery flow)
      const hash = window.location.hash
      if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (!error) {
            setHasValidSession(true)
            setIsCheckingAuth(false)
            return
          }
        }
      }

      // If we get here, no valid session or recovery token found
      toast({
        title: "Invalid or expired reset link",
        description: "Please request a new password reset link.",
        variant: "destructive",
      })
      setTimeout(() => router.push("/auth/login"), 2000)
      setIsCheckingAuth(false)
    }

    checkSession()
  }, [router, toast])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      })
      return
    }

    const supabase = createClient()

    if (!supabase) {
      toast({
        title: "Configuration error",
        description: "Unable to connect to authentication service.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      toast({
        title: "Password updated",
        description: "Your password has been successfully reset.",
      })

      router.push("/auth/login")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred"
      toast({
        title: "Failed to reset password",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking session
  if (isCheckingAuth) {
    return (
      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Don't show form if session is invalid
  if (!hasValidSession) {
    return null
  }

  return (
    <div className="w-full max-w-sm">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update password"}
            </Button>
            <div className="text-center text-sm">
              <Link href="/auth/login" className="text-muted-foreground hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
