"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Mail, Phone } from "lucide-react"
import { useState } from "react"

// Mock data
const mockContacts = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@techcorp.com",
    company: "TechCorp",
    title: "Senior Product Manager",
    degree: "1st",
    phone: "+1 (555) 123-4567",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "m.chen@innovateb.io",
    company: "InnovateB",
    title: "CTO",
    degree: "2nd",
    phone: "+1 (555) 234-5678",
  },
  {
    id: 3,
    name: "Emma Rodriguez",
    email: "emma.r@startupx.com",
    company: "StartupX",
    title: "Founder & CEO",
    degree: "1st",
    phone: "+1 (555) 345-6789",
  },
  {
    id: 4,
    name: "James Wilson",
    email: "j.wilson@finance.co",
    company: "FinanceHub",
    title: "Investment Director",
    degree: "3rd",
    phone: "+1 (555) 456-7890",
  },
  {
    id: 5,
    name: "Lisa Park",
    email: "lisa.park@designstudio.com",
    company: "Design Studio",
    title: "Design Lead",
    degree: "2nd",
    phone: "+1 (555) 567-8901",
  },
]

const degreeColors = {
  "1st": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "2nd": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "3rd": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
}

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredContacts = mockContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchTerm.toLowerCase()),
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
          <CardTitle>All Contacts ({filteredContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Degree</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contact</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-foreground">{contact.name}</td>
                    <td className="py-4 px-4 text-muted-foreground">{contact.company}</td>
                    <td className="py-4 px-4 text-muted-foreground">{contact.title}</td>
                    <td className="py-4 px-4">
                      <Badge className={degreeColors[contact.degree as keyof typeof degreeColors]}>
                        {contact.degree}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                          <Mail className="w-4 h-4" />
                        </a>
                        <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                          <Phone className="w-4 h-4" />
                        </a>
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
        </CardContent>
      </Card>
    </div>
  )
}
