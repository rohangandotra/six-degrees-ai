"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Users, Search, Loader2, Mail, Check, X, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getApiUrl } from "@/lib/api-config"

interface Connection {
  connection_id: string
  user_id: string
  email: string
  full_name: string
  network_sharing_enabled: boolean
  i_share_network: boolean
  connected_at: string
  role: 'requester' | 'accepter'
}

interface PendingRequest {
  connection_id: string
  requester_id: string
  requester_email: string
  requester_name: string
  requested_at: string
  request_message?: string
}

interface User {
  id: string
  email: string
  full_name: string
}

export default function NetworkPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const { toast } = useToast()

  // Fetch connections on mount
  useEffect(() => {
    fetchConnections()
    fetchPendingRequests()
  }, [])

  const fetchConnections = async () => {
    try {
      const response = await fetch(getApiUrl('/api/connections'))
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Error fetching connections:', error)
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(getApiUrl('/api/connections/pending'))
      if (response.ok) {
        const data = await response.json()
        setPendingRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error)
    }
  }

  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchQuery.length < 2) {
      toast({
        title: "Query too short",
        description: "Enter at least 2 characters",
        variant: "destructive"
      })
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(getApiUrl('/api/users/search'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      } else {
        toast({
          title: "Search failed",
          description: "Unable to search users",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const sendConnectionRequest = async (targetUserId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(getApiUrl('/api/connections'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Request sent!",
          description: data.message
        })
        setSearchResults(prev => prev.filter(u => u.id !== targetUserId))
      } else {
        toast({
          title: "Failed to send request",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Send request error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequest = async (connectionId: string, action: 'accept' | 'decline', shareNetwork: boolean = true) => {
    setIsLoading(true)
    try {
      const response = await fetch(getApiUrl('/api/connections/pending'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId, action, share_network: shareNetwork })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: action === 'accept' ? "Connection accepted!" : "Connection declined",
          description: data.message
        })
        fetchPendingRequests()
        fetchConnections()
      } else {
        toast({
          title: "Action failed",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Request action error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSharing = async (connectionId: string, role: 'requester' | 'accepter', currentValue: boolean) => {
    try {
      const response = await fetch(getApiUrl(`/api/connections/${connectionId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_network: !currentValue })
      })

      if (response.ok) {
        toast({
          title: "Sharing updated",
          description: !currentValue ? "You are now sharing your network" : "Network sharing disabled"
        })
        fetchConnections()
      } else {
        toast({
          title: "Update failed",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Toggle sharing error:', error)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Network</h1>
        <p className="text-muted-foreground">Manage your professional connections and expand your network</p>
      </div>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connections">
            <Users className="w-4 h-4 mr-2" />
            My Connections ({connections.length})
          </TabsTrigger>
          <TabsTrigger value="find">
            <Search className="w-4 h-4 mr-2" />
            Find People
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Mail className="w-4 h-4 mr-2" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* My Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No connections yet. Use "Find People" to connect with others!</p>
              </CardContent>
            </Card>
          ) : (
            connections.map((conn) => (
              <Card key={conn.connection_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{conn.full_name}</CardTitle>
                      <CardDescription>{conn.email}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge variant={conn.network_sharing_enabled ? "default" : "secondary"}>
                        {conn.network_sharing_enabled ? "Sharing with you" : "Not sharing"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={conn.i_share_network}
                        onCheckedChange={() => toggleSharing(conn.connection_id, conn.role, conn.i_share_network)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {conn.i_share_network ? "You are sharing your network" : "Share your network"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Connected {new Date(conn.connected_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Find People Tab */}
        <TabsContent value="find" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search for People</CardTitle>
              <CardDescription>Find and connect with other users by name or email</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchUsers} className="flex gap-3">
                <Input
                  placeholder="Enter name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="ml-2">Search</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{user.full_name}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                      </div>
                      <Button
                        onClick={() => sendConnectionRequest(user.id)}
                        disabled={isLoading}
                        size="sm"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending connection requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((req) => (
              <Card key={req.connection_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{req.requester_name}</CardTitle>
                      <CardDescription>{req.requester_email}</CardDescription>
                      {req.request_message && (
                        <p className="text-sm mt-2 text-foreground/80">"{req.request_message}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested on {new Date(req.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRequest(req.connection_id, 'accept', true)}
                        disabled={isLoading}
                        size="sm"
                        variant="default"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleRequest(req.connection_id, 'decline')}
                        disabled={isLoading}
                        size="sm"
                        variant="outline"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
