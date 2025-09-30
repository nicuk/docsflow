import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/**
 * Isolated Clerk Sign-In Page
 * 
 * Route: /sign-in-clerk
 * Purpose: Test Clerk authentication without affecting /login
 */
export default function SignInClerkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Test Environment Banner */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  🧪 Test Environment
                </Badge>
                <p className="text-sm text-blue-900 mt-2">
                  Testing Clerk authentication in isolation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clerk Sign In Component */}
        <div className="flex justify-center">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-lg"
              }
            }}
            afterSignInUrl="/dashboard-clerk"
            redirectUrl="/dashboard-clerk"
            signUpUrl="/sign-up-clerk"
          />
        </div>

        {/* Navigation Links */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Main app still uses Supabase auth
              </p>
              <Link 
                href="/login" 
                className="text-blue-600 hover:underline text-sm block"
              >
                ← Back to main login (Supabase)
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
