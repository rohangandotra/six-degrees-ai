"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Mail, Phone, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface Contact {
  id: string
  full_name: string
  email: string
  company: string
  position: string
  phone?: string
}

const degreeColors = {
  "1st": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "2nd": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "3rd": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
}

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContacts() {
      const supabase = createClient()

      if (!supabase) {
        setError("Unable to connect to database")
        setLoading(false)
        return
      }

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setError("Please log in to view contacts")
          setLoading(false)
          return
        }

        // Fetch contacts for the current user
        const { data, error: fetchError } = await supabase
          .from("contacts")
          .select("id, full_name, email, company, position, phone")
          .eq("user_id", user.id)
          .order("full_name")

        if (fetchError) {
          console.error("Error fetching contacts:", fetchError)
          setError("Failed to load contacts")
        } else {
          setContacts(data || [])
        }
      } catch (err) {
        console.error("Error:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchContacts()
  }, [])

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Contacts</h1>
        <p className="text-muted-foreground">Manage and search through all your professional contacts</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Contacts ({loading ? "..." : filteredContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading contacts...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No contacts found matching your search" : "No contacts yet. Upload a CSV file to get started!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contact</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4 font-medium text-foreground">{contact.full_name}</td>
                      <td className="py-4 px-4 text-muted-foreground">{contact.company || "—"}</td>
                      <td className="py-4 px-4 text-muted-foreground">{contact.position || "—"}</td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
