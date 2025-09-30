import { SignUp } from "@clerk/nextjs"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/**
 * Isolated Clerk Sign-Up Page
 * 
 * Route: /sign-up-clerk
 * Purpose: Test Clerk registration without affecting /register
 */
export default function SignUpClerkPage() {
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
                  Testing Clerk registration in isolation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clerk Sign Up Component */}
        <div className="flex justify-center">
          <SignUp 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-lg"
              }
            }}
            afterSignUpUrl="/dashboard-clerk"
            redirectUrl="/dashboard-clerk"
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
                href="/register" 
                className="text-blue-600 hover:underline text-sm block"
              >
                ← Back to main registration (Supabase)
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
