# Google OAuth Custom Domain Setup for DocsFlow

## Issue
Currently showing: lhcopwwiqwjpzbdnjovo.supabase.co
Want to show: docsflow.app

## Solution

### Step 1: Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to APIs & Services > Credentials
4. Click on your OAuth 2.0 Client ID

### Step 2: Update Authorized Redirect URIs
Replace Supabase URLs with your custom domain:
```
OLD: https://lhcopwwiqwjpzbdnjovo.supabase.co/auth/v1/callback
NEW: https://docsflow.app/api/auth/callback
```

### Step 3: Update Supabase Configuration
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Set Site URL to: `https://docsflow.app`
3. Add Redirect URLs:
   - `https://docsflow.app/*`
   - `https://*.docsflow.app/*`

### Step 4: Environment Variables
Update your `.env.local`:
```env
NEXT_PUBLIC_SITE_URL=https://docsflow.app
NEXT_PUBLIC_SUPABASE_URL=https://lhcopwwiqwjpzbdnjovo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 5: Update Auth Callback Route
Create/update `app/api/auth/callback/route.ts` to handle OAuth callbacks at your custom domain
