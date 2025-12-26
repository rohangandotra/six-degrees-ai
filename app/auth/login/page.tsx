"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      if (!supabase) {
        throw new Error("Unable to connect to authentication service")
      }

      if (!email || !password) {
        toast({
          title: "Login failed",
          description: "Please fill in all fields",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        console.error("Login error:", error)
        toast({
          title: "Login failed",
          description: error.message || "Invalid email or password",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Check if user has completed onboarding
        try {
          const profileResponse = await fetch(`/api/profile?userId=${data.user.id}`)
          const profileData = await profileResponse.json()

          // If no profile or profile not completed, redirect to onboarding
          if (!profileData.success || !profileData.profile || !profileData.profile.profile_completed) {
            toast({
              title: "Welcome!",
              description: "Let's set up your profile...",
            })
            setTimeout(() => {
              router.push("/onboarding")
              router.refresh()
            }, 500)
            return
          }
        } catch (profileError) {
          console.error("Error checking profile:", profileError)
          // If profile check fails, still redirect to onboarding to be safe
          router.push("/onboarding")
          router.refresh()
          return
        }

        toast({
          title: "Login successful",
          description: "Redirecting to dashboard...",
        })

        // Wait a brief moment for the toast to show, then redirect
        setTimeout(() => {
          router.push("/dashboard")
          router.refresh() // Refresh to update auth state
        }, 500)
      }
    } catch (err: any) {
      console.error("Login error:", err)
      toast({
        title: "Login failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Enter your email and password to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:underline">
                  Forgot?
                </Link>
              </div>
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/auth/sign-up" className="font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
