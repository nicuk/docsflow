# DocsFlow SEO, Regional Redirect, and OAuth Configuration Guide

## 1. Fix Regional Redirect Issue (/my, /uk paths)

The issue is in `app/layout.tsx` lines 58-59 where alternate language URLs are defined:
```typescript
alternates: {
  canonical: 'https://docsflow.app',
  languages: {
    'en-US': 'https://docsflow.app',
    'en-MY': 'https://docsflow.app/my',  // This causes /my redirect
    'en-GB': 'https://docsflow.app/uk',   // This causes /uk redirect
  },
},
```

### Solution: Remove or update the alternates
These alternate language URLs tell search engines and browsers about regional versions. If you don't have separate regional content, remove them.

## 2. Google Search Console Setup

### Step 1: Verify Domain Ownership
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property → Domain → Enter `docsflow.app`
3. Add TXT record to your DNS:
   ```
   Type: TXT
   Name: @ (or leave blank)
   Value: google-site-verification=YOUR_VERIFICATION_CODE
   ```

### Step 2: Submit Sitemap
Create `public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://docsflow.app/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://docsflow.app/login</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://docsflow.app/register</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Step 3: Create robots.txt
Create `public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Sitemap: https://docsflow.app/sitemap.xml
```

## 3. Configure Logo for Google OAuth & Search

### For Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → OAuth consent screen
3. Edit App → Application logo → Upload your logo (must be HTTPS URL)
4. Recommended: 120x120px minimum, square format

### For Google Search Results:
Add structured data to your homepage:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "DocsFlow",
  "url": "https://docsflow.app",
  "logo": "https://docsflow.app/logo.png",
  "description": "AI-powered document intelligence platform",
  "sameAs": [
    "https://twitter.com/docsflow",
    "https://linkedin.com/company/docsflow"
  ]
}
```

## 4. OAuth Custom Domain Configuration

### Update Supabase Auth Settings:
1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL: `https://docsflow.app`
3. Redirect URLs:
   - `https://docsflow.app/*`
   - `https://*.docsflow.app/*`
   - `https://api.docsflow.app/*`

### Update Google OAuth:
1. Google Cloud Console → APIs & Services → Credentials
2. OAuth 2.0 Client → Authorized redirect URIs:
   - Remove: `https://lhcopwwiqwjpzbdnjovo.supabase.co/auth/v1/callback`
   - Add: `https://docsflow.app/api/auth/callback`
   - Add: `https://api.docsflow.app/api/auth/google/callback`

## 5. Implementation Steps

### Priority 1: Fix Regional Redirects
- Update `app/layout.tsx` to remove unwanted language alternates
- Test that /my and /uk no longer redirect

### Priority 2: OAuth Domain Update
- Update Supabase settings
- Update Google OAuth settings
- Update environment variables
- Test OAuth flow

### Priority 3: SEO Setup
- Create sitemap.xml
- Create robots.txt
- Verify in Google Search Console
- Submit sitemap

### Priority 4: Logo Configuration
- Upload logo to Google OAuth
- Add structured data for search results
- Create og-image.svg for social sharing
