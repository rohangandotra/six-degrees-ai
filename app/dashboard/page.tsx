"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Search, FileText, AlertCircle, Users, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalContacts: 0,
    directConnections: 0,
    loading: true,
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      if (!supabase) {
        setStats(prev => ({ ...prev, loading: false }))
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        // Fetch total contacts
        const { count: contactsCount } = await supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)

        // Fetch direct connections
        const { count: connectionsCount } = await supabase
          .from("connections")
          .select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${user.id},accepter_id.eq.${user.id}`)
          .eq("status", "accepted")

        setStats({
          totalContacts: contactsCount || 0,
          directConnections: connectionsCount || 0,
          loading: false,
        })
      } catch (err) {
        console.error("Error fetching stats:", err)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }

    fetchStats()
  }, [router])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate CSV file
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error("Unable to connect to database")
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Not authenticated")
      }

      // Read CSV file
      const text = await file.text()
      const lines = text.split("\n")
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase())

      // Parse CSV rows
      const contacts = []
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue

        const values = lines[i].split(",")
        const contact: any = {
          user_id: user.id,
        }

        headers.forEach((header, index) => {
          const value = values[index]?.trim()
          if (header.includes("name")) contact.full_name = value
          else if (header.includes("email")) contact.email = value
          else if (header.includes("company")) contact.company = value
          else if (header.includes("title") || header.includes("position")) contact.position = value
          else if (header.includes("phone")) contact.phone = value
        })

        if (contact.full_name && contact.email) {
          contacts.push(contact)
        }
      }

      // Insert contacts into database
      const { error: insertError } = await supabase
        .from("contacts")
        .insert(contacts)

      if (insertError) {
        throw insertError
      }

      setUploadedFile(file.name)
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been processed. ${contacts.length} contacts imported.`,
      })

      // Refresh stats
      const { count: contactsCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      setStats(prev => ({
        ...prev,
        totalContacts: contactsCount || 0,
      }))
    } catch (err: any) {
      console.error("Upload error:", err)
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload contacts",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Manage your professional network.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalContacts}</div>
                <p className="text-xs text-muted-foreground mt-1">In your network</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Direct Connections</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.directConnections}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalContacts > 0
                    ? `${Math.round((stats.directConnections / stats.totalContacts) * 100)}% of network`
                    : "0% of network"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">2nd Degree</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Extended Network</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Contacts</CardTitle>
          <CardDescription>Upload a CSV file to import your contacts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <label htmlFor="csv-upload" className="cursor-pointer space-y-2">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">CSV files up to 10MB</p>
              </div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {uploadedFile && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-200">File processed</p>
                <p className="text-sm text-green-700 dark:text-green-300">{uploadedFile}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              CSV should contain columns: Name, Email, Company, Job Title, Phone (optional)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to different sections of your network</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 bg-transparent"
            onClick={() => router.push("/dashboard/search")}
          >
            <Search className="w-5 h-5" />
            <span>Search Network with AI</span>
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 bg-transparent"
            onClick={() => router.push("/dashboard/contacts")}
          >
            <Users className="w-5 h-5" />
            <span>View All Contacts</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
