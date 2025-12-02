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

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Password strength validation
  const getPasswordStrength = (pwd: string) => {
    let strength = 0
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    }

    if (checks.length) strength++
    if (checks.uppercase) strength++
    if (checks.lowercase) strength++
    if (checks.number) strength++
    if (checks.special) strength++

    return { strength, checks }
  }

  const passwordValidation = getPasswordStrength(password)
  const isPasswordValid = passwordValidation.checks.length &&
    passwordValidation.checks.uppercase &&
    passwordValidation.checks.lowercase &&
    passwordValidation.checks.number

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      })
      return
    }

    if (!isPasswordValid) {
      toast({
        title: "Password too weak",
        description: "Password must be at least 8 characters with uppercase, lowercase, and a number.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      if (!supabase) {
        throw new Error("Unable to connect to authentication service")
      }

      // Create account with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName,
          },
        },
      })

      if (error) {
        console.error("Signup error:", error)
        toast({
          title: "Sign up failed",
          description: error.message || "Unable to create account",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (data.user) {
        toast({
          title: "Account created",
          description: "Check your email to verify your account",
        })
        router.push("/auth/sign-up-success")
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      toast({
        title: "Sign up failed",
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
          <CardTitle className="text-2xl font-bold">Create account</CardTitle>
          <CardDescription>Enter your details below to create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              {password && (
                <div className="space-y-2">
                  {/* Password Strength Meter */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${passwordValidation.strength >= level
                            ? passwordValidation.strength <= 2
                              ? 'bg-red-500'
                              : passwordValidation.strength === 3
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            : 'bg-gray-200'
                          }`}
                      />
                    ))}
                  </div>

                  {/* Password Requirements */}
                  <div className="text-xs space-y-1">
                    <div className={passwordValidation.checks.length ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordValidation.checks.length ? '✓' : '○'} At least 8 characters
                    </div>
                    <div className={passwordValidation.checks.uppercase ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordValidation.checks.uppercase ? '✓' : '○'} One uppercase letter
                    </div>
                    <div className={passwordValidation.checks.lowercase ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordValidation.checks.lowercase ? '✓' : '○'} One lowercase letter
                    </div>
                    <div className={passwordValidation.checks.number ? 'text-green-600' : 'text-muted-foreground'}>
                      {passwordValidation.checks.number ? '✓' : '○'} One number
                    </div>
                    {passwordValidation.checks.special && (
                      <div className="text-green-600">
                        ✓ Special character (bonus!)
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium hover:underline">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
