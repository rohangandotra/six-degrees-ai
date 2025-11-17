"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function TestFlowPage() {
  const [testStep, setTestStep] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold">Authentication Testing Guide</h1>
          <p className="text-slate-600">Follow these steps to test the complete auth flow</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Step 1: Create an Account</CardTitle>
            <CardDescription>Test the sign-up flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-slate-700">Click the button below to go to the sign-up page. Fill in:</p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>First Name: Any name</li>
                <li>Last Name: Any surname</li>
                <li>Email: Use a real email (for verification)</li>
                <li>Password: 8+ characters</li>
              </ul>
            </div>
            <Link href="/auth/sign-up">
              <Button className="w-full" onClick={() => setTestStep("signup")}>
                Go to Sign Up
              </Button>
            </Link>
            {testStep === "signup" && (
              <p className="text-sm text-green-600">
                ✓ Fill the form and click Sign Up. Check your email for confirmation.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Verify Your Email</CardTitle>
            <CardDescription>Confirm your email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-slate-700">
                After signing up, you'll receive a confirmation email. Click the link in that email to verify your
                account.
              </p>
              <p className="text-xs text-slate-500 italic">
                Note: In development, check your spam folder. Emails are sent from Supabase.
              </p>
            </div>
            <Button variant="outline" className="w-full bg-transparent" disabled>
              Waiting for email verification...
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Log In</CardTitle>
            <CardDescription>Test the login flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-slate-700">Once your email is verified, log in with your credentials:</p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>Email: The email you registered with</li>
                <li>Password: The password you chose</li>
              </ul>
            </div>
            <Link href="/auth/login">
              <Button className="w-full" onClick={() => setTestStep("login")}>
                Go to Login
              </Button>
            </Link>
            {testStep === "login" && (
              <p className="text-sm text-green-600">
                ✓ Enter your credentials and click Login. You should be redirected to /protected.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 4: Test Forgot Password</CardTitle>
            <CardDescription>Test the password reset flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-slate-700">If you want to test the forgot password flow:</p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>Go to the login page</li>
                <li>Click "Forgot?" link</li>
                <li>Enter your email</li>
                <li>Check your email for the reset link</li>
              </ul>
            </div>
            <Link href="/auth/forgot-password">
              <Button variant="outline" className="w-full bg-transparent">
                Go to Forgot Password
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>Database Tables:</strong> Before testing, you need to run the SQL scripts from the scripts folder
              to create the database tables. These are in:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>scripts/001_create_profiles.sql</li>
              <li>scripts/002_profile_trigger.sql</li>
            </ul>
            <p className="mt-4">
              <strong>Email Verification:</strong> Supabase will send a confirmation email to the address you use. Make
              sure to check your email (including spam) to complete the signup process.
            </p>
            <p>
              <strong>Protected Route:</strong> After logging in, you'll be redirected to /protected. This requires
              authentication and should show your profile data once it's saved.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
