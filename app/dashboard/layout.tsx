"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Network, Settings, LogOut, Menu, X, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/search", label: "Search", icon: Search },
    { href: "/dashboard/contacts", label: "Contacts", icon: Users },
    { href: "/dashboard/network", label: "Extended Network", icon: Network },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ]

  const handleLogout = () => {
    router.push("/auth/login")
  }

  const NavContent = () => (
    <>
      <nav className="flex-1 px-3 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 md:py-2 rounded-lg transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {(sidebarOpen || isMobile) && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-transparent py-3 md:py-2"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {(sidebarOpen || isMobile) && "Logout"}
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">6th AI</span>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="p-6 flex items-center gap-2 border-b border-border">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Network className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-foreground">6th AI</span>
                </div>
                <NavContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={`${sidebarOpen ? "w-64" : "w-20"} border-r border-border bg-card transition-all duration-300 flex flex-col`}
        >
          <div className="p-6 flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Network className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">6th AI</span>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          <NavContent />
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-16 pb-4' : ''}`}>
        {children}
      </main>
    </div>
  )
}
