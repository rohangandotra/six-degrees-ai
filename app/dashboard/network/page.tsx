"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Network } from "lucide-react"

// Mock data for network visualization
const networkStats = [
  { degree: "1st", count: 89, color: "bg-green-500" },
  { degree: "2nd", count: 1200, color: "bg-blue-500" },
  { degree: "3rd", count: 3400, color: "bg-purple-500" },
  { degree: "4th", count: 2100, color: "bg-yellow-500" },
  { degree: "5th", count: 1300, color: "bg-pink-500" },
  { degree: "6th", count: 420, color: "bg-indigo-500" },
]

export default function NetworkPage() {
  const totalNetwork = networkStats.reduce((sum, stat) => sum + stat.count, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Extended Network</h1>
        <p className="text-muted-foreground">Explore your professional network up to the 6th degree</p>
      </div>

      {/* Network Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Network Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center pb-6">
            <div className="text-4xl font-bold text-primary mb-2">{totalNetwork.toLocaleString()}</div>
            <p className="text-muted-foreground">Total contacts in your extended network</p>
          </div>

          {/* Network Breakdown */}
          <div className="space-y-4">
            {networkStats.map((stat) => {
              const percentage = (stat.count / totalNetwork) * 100
              return (
                <div key={stat.degree} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{stat.degree} Degree</Badge>
                      <span className="text-sm text-muted-foreground">{stat.count.toLocaleString()} contacts</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className={`h-full ${stat.color} transition-all`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Network Analysis */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Top Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "TechCorp", count: 34 },
                { name: "InnovateBio", count: 28 },
                { name: "StartupX", count: 21 },
                { name: "FinanceHub", count: 18 },
                { name: "Design Studio", count: 15 },
              ].map((company) => (
                <div key={company.name} className="flex justify-between items-center">
                  <span className="text-sm text-foreground">{company.name}</span>
                  <Badge variant="secondary">{company.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Top Industries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Technology", count: 245 },
                { name: "Finance", count: 189 },
                { name: "Healthcare", count: 156 },
                { name: "Consulting", count: 142 },
                { name: "Startups", count: 128 },
              ].map((industry) => (
                <div key={industry.name} className="flex justify-between items-center">
                  <span className="text-sm text-foreground">{industry.name}</span>
                  <Badge variant="secondary">{industry.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
