// Jest setup file
// This file runs before each test file

// Mock environment variables for testing
process.env.GOOGLE_AI_API_KEY = 'test-api-key-for-jest'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
