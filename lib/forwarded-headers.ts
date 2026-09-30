/**
 * The request headers middleware forwards to route handlers.
 *
 * `x-user-id` is identity, so any client-sent value is always dropped; routes
 * get the verified user from Clerk's auth(). Tenant headers are only a hint of
 * which workspace the caller means: a tenant resolved from the hostname wins
 * over anything the client sent, and routes still check membership.
 */
export function buildForwardedHeaders(
  incoming: Headers,
  resolved: { tenant: string | null; tenantId: string | null },
): Headers {
  const headers = new Headers(incoming);
  headers.delete('x-user-id');

  const { tenant, tenantId } = resolved;
  if (tenant && tenant !== 'localhost-dev') {
    headers.set('x-tenant-subdomain', tenant);
    if (tenantId) {
      headers.set('x-tenant-id', tenantId);
    } else {
      headers.delete('x-tenant-id');
    }
  }
  return headers;
}
