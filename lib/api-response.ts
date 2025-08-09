// Standardized API response format for consistency across all endpoints

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Standard error codes
export const API_ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  
  // Business Logic
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  SUBDOMAIN_TAKEN: 'SUBDOMAIN_TAKEN',
  ONBOARDING_INCOMPLETE: 'ONBOARDING_INCOMPLETE',
  PERSONA_GENERATION_FAILED: 'PERSONA_GENERATION_FAILED',
} as const;

// Helper functions for creating standardized responses
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(
  error: string | ApiError,
  code?: string,
  statusCode?: number
): { response: ApiResponse; status: number } {
  const errorObj = typeof error === 'string' 
    ? { code: code || API_ERROR_CODES.INTERNAL_ERROR, message: error }
    : error;

  return {
    response: {
      success: false,
      error: errorObj.message,
      code: errorObj.code,
      timestamp: new Date().toISOString(),
    },
    status: statusCode || getStatusCodeFromErrorCode(errorObj.code),
  };
}

// Map error codes to HTTP status codes
function getStatusCodeFromErrorCode(code: string): number {
  switch (code) {
    case API_ERROR_CODES.UNAUTHORIZED:
    case API_ERROR_CODES.TOKEN_EXPIRED:
      return 401;
    case API_ERROR_CODES.FORBIDDEN:
      return 403;
    case API_ERROR_CODES.NOT_FOUND:
    case API_ERROR_CODES.TENANT_NOT_FOUND:
      return 404;
    case API_ERROR_CODES.VALIDATION_ERROR:
    case API_ERROR_CODES.MISSING_REQUIRED_FIELDS:
    case API_ERROR_CODES.INVALID_INPUT:
      return 400;
    case API_ERROR_CODES.ALREADY_EXISTS:
    case API_ERROR_CODES.SUBDOMAIN_TAKEN:
    case API_ERROR_CODES.CONFLICT:
      return 409;
    case API_ERROR_CODES.RATE_LIMIT_EXCEEDED:
      return 429;
    case API_ERROR_CODES.SERVICE_UNAVAILABLE:
      return 503;
    case API_ERROR_CODES.TIMEOUT:
      return 408;
    case API_ERROR_CODES.INTERNAL_ERROR:
    case API_ERROR_CODES.PERSONA_GENERATION_FAILED:
    default:
      return 500;
  }
}

// Validation helper
export function validateRequiredFields(data: any, requiredFields: string[]): string[] {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missing.push(field);
    }
  }
  
  return missing;
}

// Error logging helper
export function logApiError(endpoint: string, error: any, context?: any) {
  const errorLog = {
    endpoint,
    error: error.message || error,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };
  
  console.error('API Error:', errorLog);
  
  // In production, you'd send this to your error tracking service
  // e.g., Sentry, LogRocket, etc.
}

// Response wrapper for Next.js API routes
export function createApiResponse<T>(
  data: T, 
  message?: string, 
  headers?: HeadersInit
) {
  return Response.json(createSuccessResponse(data, message), { headers });
}

export function createApiErrorResponse(
  error: string | ApiError,
  code?: string,
  headers?: HeadersInit
) {
  const { response, status } = createErrorResponse(error, code);
  return Response.json(response, { status, headers });
}
