import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/login',
        '/signup',
        '/register',
        '/onboarding',
        '/onboarding-success',
        '/select-workspace',
        '/auth/',
        '/sso-callback',
        '/auth-redirect',
        '/invite/',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        '/domain-created',
        '/sign-in-clerk/',
        '/sign-up-clerk/',
        '/api/',
      ],
    },
    sitemap: 'https://docsflow.app/sitemap.xml',
  }
}
