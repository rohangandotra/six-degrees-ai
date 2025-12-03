import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Network, Search, Shield, Zap } from "lucide-react"

import LandingHero from "@/components/landing-hero"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Sixth Degree</span>
          </div>
          <div className="flex gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <LandingHero />

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Powerful Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>AI-Powered Search</CardTitle>
              <CardDescription>Find connections using natural language queries</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Your Data is Safe</CardTitle>
              <CardDescription>Enterprise-grade security with GDPR & CCPA compliance</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Sixth Degree</CardTitle>
              <CardDescription>Explore your extended network up to the 6th degree</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="pt-12">
            <h2 className="text-3xl font-bold mb-4 text-balance">Ready to expand your network?</h2>
            <p className="text-lg mb-8 opacity-90">Start discovering valuable connections today.</p>
            <Link href="/auth/sign-up">
              <Button size="lg" variant="secondary">
                Get Started Free
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
