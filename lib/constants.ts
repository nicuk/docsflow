/**
 * Application-wide constants derived from environment variables.
 *
 * Centralizes domain and URL references that were previously hardcoded
 * across auth, API, cookie, and redirect logic.
 */

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'docsflow.app';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || `https://${APP_DOMAIN}`;
export const API_URL = process.env.NEXT_PUBLIC_API_URL || `https://api.${APP_DOMAIN}/api`;
export const COOKIE_DOMAIN = `.${APP_DOMAIN}`;

export function tenantUrl(subdomain: string, path = '/dashboard'): string {
  return `https://${subdomain}.${APP_DOMAIN}${path}`;
}
