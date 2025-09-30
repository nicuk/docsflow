import { ClerkProvider } from '@clerk/nextjs'
import React from 'react'

export default function SignInClerkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  )
}
