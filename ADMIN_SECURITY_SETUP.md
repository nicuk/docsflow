# Admin System Health Security Setup

## 🔒 Two-Tier Admin Access Control

### Access Levels:
1. **Tenant Admin** (`/dashboard/admin/*`)
   - Access: Clerk authentication only
   - Users: Tenant administrators
   - Permissions: Manage their tenant's users, documents, settings

2. **Super Admin** (`/dashboard/admin/system-health`)
   - Access: HTTP Basic Auth + Clerk authentication (double layer)
   - Users: Platform owner only (you)
   - Permissions: System health, all tenants, infrastructure monitoring

## 🔒 HTTP Basic Authentication (Super Admin Only)

### Why This Approach?
- ✅ **Free** - Works on Vercel free tier
- ✅ **Secure** - Credentials stored as environment variables
- ✅ **Simple** - Browser-native authentication
- ✅ **Layered** - Works WITH Clerk role-based access (double protection)
- ✅ **Specific** - Only protects `/dashboard/admin/system-health`
- ✅ **No external dependencies** - Pure Next.js middleware

---

## 📋 Setup Instructions

### Step 1: Generate Strong Password
```bash
# Generate a secure random password (run in terminal)
openssl rand -base64 32
```

### Step 2: Add Environment Variables to Vercel

Go to your Vercel project → Settings → Environment Variables:

```
ADMIN_AUTH_USERNAME=admin
ADMIN_AUTH_PASSWORD=<paste-generated-password-here>
```

### Step 3: Enable the Middleware (ALREADY CONFIGURED ✅)

**Current Setup in `middleware.ts`:**
```typescript
// Two-tier admin access control
const isAdminRoute = createRouteMatcher(['/dashboard/admin(.*)'])
const isSuperAdminRoute = createRouteMatcher(['/dashboard/admin/system-health(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // 🔐 SUPER ADMIN ROUTES: HTTP Basic Auth (for system-health only)
  if (isSuperAdminRoute(req)) {
    const basicAuth = req.headers.get('authorization')
    
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = Buffer.from(authValue, 'base64').toString().split(':')
      
      if (user === process.env.ADMIN_AUTH_USERNAME && pwd === process.env.ADMIN_AUTH_PASSWORD) {
        // Auth successful, continue to Clerk auth
      } else {
        return new NextResponse('Invalid credentials', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Super Admin Area"' },
        })
      }
    } else {
      return new NextResponse('Super Admin authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Super Admin Area"' },
      })
    }
  }
  
  // Regular admin routes only need Clerk auth (handled below)
  // ... rest of middleware ...
})
```

**Access Control Summary:**
- ✅ `/dashboard/admin/users` → Clerk auth only (tenant admins)
- ✅ `/dashboard/admin/settings` → Clerk auth only (tenant admins)
- 🔐 `/dashboard/admin/system-health` → HTTP Basic Auth + Clerk (super admin only)

### Step 4: Redeploy to Vercel
```bash
git add -A
git commit -m "feat: Add HTTP Basic Auth for admin routes"
git push
```

---

## 🧪 Testing

1. Navigate to `/dashboard/admin/system-health`
2. Browser will show login prompt
3. Enter:
   - **Username:** `admin` (or your configured value)
   - **Password:** `<your-generated-password>`
4. After Basic Auth, Clerk role-based access also applies

---

## 🛡️ Security Layers

Your `/dashboard/admin/system-health` now has **3 layers of security**:

1. **HTTP Basic Authentication** ← NEW (username/password)
2. **Clerk Authentication** (user must be signed in)
3. **Role-Based Access Control** (user must be admin with `accessLevel === 1`)

An attacker would need to bypass ALL THREE to gain access.

---

## 🔄 Alternative Options (if you want something else)

### Option 1: Vercel Password Protection (Enterprise Only)
- Cost: $150+/month
- Setup: Vercel Dashboard → Settings → Deployment Protection
- Pro: Zero code, managed by Vercel
- Con: Very expensive

### Option 2: IP Whitelisting (Vercel Edge Config)
- Cost: Free
- Setup: https://vercel.com/docs/storage/edge-config
- Pro: Only allow specific IPs
- Con: Doesn't work well with dynamic IPs (home/mobile)

### Option 3: Separate Subdomain with Cloudflare Access
- Cost: Free (Cloudflare)
- Setup: Create `admin.docsflow.app` → Add Cloudflare Access
- Pro: Enterprise-grade zero-trust security
- Con: More complex setup, additional service

### Option 4: VPN-Only Access
- Cost: Varies ($5-50/month)
- Setup: Deploy admin routes on private VPN-only subdomain
- Pro: Most secure
- Con: Requires VPN client, not practical for emergency access

---

## 💡 Recommendation

**Use HTTP Basic Auth (the provided solution)**
- Perfect balance of security, cost (free), and simplicity
- Industry-standard approach for admin panels
- Works seamlessly with your existing Clerk setup

---

## 🔑 Password Management

Store your admin password securely:
- Use a password manager (1Password, Bitwarden, etc.)
- Share with team via secure password sharing (NOT Slack/email)
- Rotate password every 90 days
- Use different passwords for dev/staging/production

