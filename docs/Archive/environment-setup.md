# Environment Variables Setup for Production

## Required Environment Variables

To run the multi-tenant SaaS platform in production, you need to set up the following environment variables:

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key (for frontend client)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for backend privileged operations)

### Redis Configuration
- `KV_REST_API_URL`: Your Upstash Redis REST API URL
- `KV_REST_API_TOKEN`: Your Upstash Redis REST API token

### Google AI Configuration
- `GOOGLE_AI_API_KEY`: Your Google AI Studio API key for Gemini integration

### Domain Configuration
- `NEXT_PUBLIC_ROOT_DOMAIN`: The root domain for your platform (e.g., docsflow.app)

## Setup Instructions

1. Create a `.env.local` file in the root directory of the project
2. Add all the required environment variables with their actual values
3. Ensure the Redis configuration is properly set up for caching to work in production

## Example .env.local File

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis Configuration
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_redis_token

# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_studio_key

# Domain Configuration
NEXT_PUBLIC_ROOT_DOMAIN=docsflow.app

# Environment
NODE_ENV=production
```

## Security Notes

- Never commit `.env.local` files to version control
- The `.gitignore` file already excludes all `.env*` files
- Ensure your production environment has these variables set through your deployment platform (Vercel, etc.)
