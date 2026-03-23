import type { MetadataRoute } from "next"

const DISALLOWED_PATHS = [
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
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/llms.txt'],
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/llms.txt'],
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/', '/llms.txt'],
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', '/llms.txt'],
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/llms.txt'],
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: 'Bytespider',
        disallow: ['/'],
      },
      {
        userAgent: 'cohere-ai',
        allow: ['/', '/llms.txt'],
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: 'https://docsflow.app/sitemap.xml',
  }
}
