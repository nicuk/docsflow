/**
 * HTTP Basic Authentication for Admin Routes
 * 
 * This middleware adds an additional layer of security for admin-only routes
 * beyond role-based access control. It requires a username/password to access
 * any route under /dashboard/admin/*
 * 
 * Setup:
 * 1. Add these environment variables to Vercel:
 *    - ADMIN_AUTH_USERNAME (e.g., "admin")
 *    - ADMIN_AUTH_PASSWORD (generate strong password)
 * 
 * 2. Rename this file to `middleware-admin.ts` and place in `/app/dashboard/admin/`
 *    or integrate into your main middleware.ts
 * 
 * Security Level: Medium-High
 * - Username/password stored as env vars (secure on Vercel)
 * - HTTP Basic Auth (standard browser authentication)
 * - Works with existing Clerk role-based access
 * 
 * Alternative Options:
 * 1. Vercel Password Protection (Enterprise plan only) - https://vercel.com/docs/security/deployment-protection
 * 2. IP Whitelisting via Vercel Edge Config - https://vercel.com/docs/storage/edge-config
 * 3. Vercel Authentication with Auth.js - https://authjs.dev/
 */

import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: '/dashboard/admin/:path*',
}

export function middleware(req: NextRequest) {
  // Skip auth in development if env vars not set
  if (process.env.NODE_ENV === 'development' && !process.env.ADMIN_AUTH_USERNAME) {
    return NextResponse.next()
  }

  const basicAuth = req.headers.get('authorization')
  const url = req.nextUrl

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')

    const validUser = process.env.ADMIN_AUTH_USERNAME
    const validPassword = process.env.ADMIN_AUTH_PASSWORD

    if (user === validUser && pwd === validPassword) {
      return NextResponse.next()
    }
  }

  // Return 401 with Basic Auth challenge
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin Area", charset="UTF-8"',
    },
  })
}

