import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Network, Search, Shield, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">6th Degree AI</span>
          </div>
          <div className="flex gap-3">
            <Link href="/auth/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-6 text-balance">
          Unlock Your Professional Network
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
          Discover, search, and analyze your professional network with AI-powered insights. Connect to the 6th degree.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/auth/sign-up">
            <Button size="lg" className="gap-2">
              Start Free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </section>

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
