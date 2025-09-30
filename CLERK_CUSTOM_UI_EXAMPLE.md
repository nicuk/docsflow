# Clerk with Custom UI (Keep Your Design)

## How to Use Clerk Headlessly (No Clerk Branding)

### Your Existing Login Component:
```tsx
// components/login-page.tsx (KEEP YOUR DESIGN!)

"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignIn } from '@clerk/nextjs' // Only add this import

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, isLoaded } = useSignIn() // Add this hook
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isLoaded) return

    try {
      // Replace Supabase fetch with Clerk method
      const result = await signIn.create({
        identifier: email,
        password: password,
      })

      if (result.status === "complete") {
        // Success! Redirect to tenant subdomain
        router.push(`https://bitto.docsflow.app/dashboard`)
      }
    } catch (err: any) {
      setErrors({ general: err.errors[0]?.message || "Login failed" })
    }
  }

  return (
    // YOUR EXACT EXISTING JSX/DESIGN HERE
    // No changes needed!
    <div className="your-beautiful-design">
      {/* Keep all your existing UI */}
    </div>
  )
}
```

### Google OAuth (Keep Your Button Design):
```tsx
// Your existing "Continue with Google" button
import { useSignIn } from '@clerk/nextjs'

const { signIn } = useSignIn()

const handleGoogleAuth = async () => {
  await signIn.authenticateWithRedirect({
    strategy: "oauth_google",
    redirectUrl: "/sso-callback",
    redirectUrlComplete: "https://bitto.docsflow.app/dashboard"
  })
}

// Your button (no design changes)
<button onClick={handleGoogleAuth} className="your-google-button-style">
  <GoogleIcon /> Continue with Google
</button>
```

## Benefits:

✅ **Zero design changes** - Keep your exact UI
✅ **No Clerk branding** - Users never see Clerk logo
✅ **Same user experience** - Just authentication backend changes
✅ **Works across subdomains** - Proven in our test!

## What Users See:

**Before (Supabase):**
- Your DocsFlow login page ✅
- Your branding ✅
- Login issues ❌

**After (Clerk Headless):**
- Your DocsFlow login page ✅
- Your branding ✅
- Login works perfectly ✅

## Next Steps:

1. Keep `components/login-page.tsx` design
2. Replace `fetch('/api/auth/login')` with `signIn.create()`
3. No UI changes needed!

