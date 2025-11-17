import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const supabase = await createClient()

  if (!supabase) {
    return (
      <div className="container mx-auto py-12">
        <h1 className="text-4xl font-bold mb-6">Protected Page (Demo Mode)</h1>
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Running in UI-only mode. Backend authentication is not configured yet. Add Supabase environment variables to
            enable real authentication.
          </p>
        </div>
        <pre className="bg-muted p-4 rounded-lg overflow-auto">
          {JSON.stringify({ user: { id: "demo-user", email: "user@example.com" } }, null, 2)}
        </pre>
      </div>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-6">Protected Page</h1>
      <pre className="bg-muted p-4 rounded-lg overflow-auto">{JSON.stringify({ user }, null, 2)}</pre>
    </div>
  )
}
