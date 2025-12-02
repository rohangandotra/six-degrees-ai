"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Save, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const [firstName, setFirstName] = useState("John")
  const [lastName, setLastName] = useState("Doe")
  const [email, setEmail] = useState("john.doe@example.com")
  const [company, setCompany] = useState("TechCorp")
  const [jobTitle, setJobTitle] = useState("Product Manager")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        // Pre-fill email if not set
        if (email === "john.doe@example.com") setEmail(user.email || "")
      }
    }
    fetchUser()
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully",
      })
      setIsSaving(false)
    }, 800)
  }

  const handleLogout = () => {
    router.push("/auth/login")
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/user/export')
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `six_degrees_export_${userId}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({ title: "Data exported successfully" })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Please try again later",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure? This will permanently delete your account and all data. This action cannot be undone.")) return

    try {
      const response = await fetch('/api/user/delete', { method: 'DELETE' })
      if (!response.ok) throw new Error('Deletion failed')

      toast({ title: "Account deleted" })
      router.push('/auth/login')
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "Please try again later",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal and professional details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect external tools to Sixth Degree</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>LinkedIn Sync Key</Label>
            <div className="flex gap-2">
              <Input value={userId || "Loading..."} readOnly className="font-mono bg-muted" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(userId || "")
                  toast({ title: "Copied to clipboard" })
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste this key into the Sixth Degree Chrome Extension to sync your connections.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>Manage your data rights (GDPR/CCPA)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Export Data</Label>
              <p className="text-xs text-muted-foreground">Download a copy of all your data</p>
            </div>
            <Button variant="outline" onClick={handleExport}>
              Export JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account security and session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
            Change Password
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
            Enable Two-Factor Authentication
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive bg-transparent"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete}>Delete Account</Button>
          <p className="text-xs text-muted-foreground mt-2">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
