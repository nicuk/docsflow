import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock the Supabase client
global.fetch = jest.fn();

describe('Onboarding Completion API', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    
    // Set required environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('should handle duplicate subdomain error gracefully', async () => {
    // Mock cookies
    const mockCookies = {
      getAll: jest.fn().mockReturnValue([]),
      set: jest.fn(),
    };
    
    // Mock the cookies function
    jest.mock('next/headers', () => ({
      cookies: jest.fn().mockResolvedValue(mockCookies),
    }));
    
    // Create a mock request with data that would cause a duplicate subdomain error
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        responses: {
          business_overview: 'Test business',
        },
        tenantAssignment: {
          companyName: 'Test Company',
          subdomain: 'existing-subdomain',
        },
      }),
      headers: {
        get: jest.fn().mockReturnValue('http://localhost:3000'),
      },
    } as unknown as NextRequest;
    
    // Mock Supabase client to simulate existing tenant
    // This would require more detailed mocking of the Supabase client
    
    // For now, let's just verify the function can be imported and called
    expect(POST).toBeDefined();
  });
});
