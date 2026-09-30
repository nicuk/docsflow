import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { fakeSupabase } from './fakes';

/**
 * Regression tests for the tenant-isolation fixes. Each one pins a request that
 * used to succeed for someone it shouldn't have.
 */

const clerk = vi.hoisted(() => ({
  userId: null as string | null,
  publicMetadata: {} as Record<string, unknown>,
  email: 'someone@example.com',
  emailVerified: true,
}));
const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fakes').fakeSupabase> | null }));
const subdomain = vi.hoisted(() => ({
  current: null as { id: string; subdomain: string } | null,
  updates: [] as unknown[],
}));

// The shape Clerk returns: a primary address id, and a verification status per address.
const clerkEmails = () => ({
  primaryEmailAddressId: 'email_1',
  emailAddresses: [
    { id: 'email_1', emailAddress: clerk.email, verification: { status: clerk.emailVerified ? 'verified' : 'unverified' } },
  ],
});

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: clerk.userId }),
  currentUser: async () => (clerk.userId ? { id: clerk.userId, firstName: 'Test', ...clerkEmails() } : null),
  clerkClient: async () => ({
    users: {
      getUser: async () => ({ publicMetadata: clerk.publicMetadata, ...clerkEmails() }),
      updateUserMetadata: async () => ({}),
    },
  }),
}));
// Routes create their client at import time, so the mock hands out a proxy that
// always talks to the current test's fake rather than the first one created.
const liveClient = vi.hoisted(() => ({
  from: (table: string) => db.current!.client.from(table),
  rpc: (...args: unknown[]) => (db.current!.client.rpc as (...a: unknown[]) => unknown)(...args),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => liveClient }));
vi.mock('@/lib/supabase', () => ({ supabase: liveClient, getSupabaseClient: () => liveClient }));
vi.mock('@/lib/redis', () => ({ redis: null, safeRedisOperation: async (_op: unknown, fallback: unknown) => fallback }));
vi.mock('@/lib/secure-database', () => ({ SecureDocumentService: {}, SecureTenantService: {}, SecureUserService: {} }));
vi.mock('@/lib/subdomains', () => ({
  getSubdomainData: async () => subdomain.current,
  updateTenantMetadata: async (_s: string, u: unknown) => {
    subdomain.updates.push(u);
    return u;
  },
}));
vi.mock('@/lib/audit-logger', () => ({ auditLogger: { logTenantAdminAction: () => {} }, AUDIT_ACTIONS: {} }));
vi.mock('@/lib/tenant-context-manager', () => ({
  TenantContextManager: { resolveTenant: async (s: string) => ({ uuid: `uuid-${s}`, subdomain: s, name: s }) },
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const MEMBER = { id: 'db-user-1', tenant_id: 'uuid-acme', role: 'member', access_level: 2 };
const ADMIN = { ...MEMBER, role: 'admin', access_level: 1 };

function signIn(row: typeof MEMBER | null) {
  clerk.userId = row ? 'user_clerk_1' : null;
  clerk.publicMetadata = row ? { supabaseUserId: row.id } : {};
}

function req(url: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  return new NextRequest(new URL(url, 'https://acme.docsflow.app'), {
    method: init.method ?? 'GET',
    headers: init.headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

beforeEach(() => {
  signIn(null);
  clerk.emailVerified = true;
  db.current = fakeSupabase({ users: MEMBER, tenants: { id: 'uuid-acme', subdomain: 'acme' } });
  subdomain.current = null;
  subdomain.updates = [];
});

describe('requireMember', () => {
  it('rejects a caller with no Clerk session', async () => {
    const { requireMember } = await import('@/lib/server-auth');
    const res = await requireMember();
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
  });

  it('rejects a member where an admin is required', async () => {
    signIn(MEMBER);
    const { requireMember } = await import('@/lib/server-auth');
    const res = await requireMember({ admin: true });
    expect((res as NextResponse).status).toBe(403);
  });

  it('rejects a member of another tenant', async () => {
    signIn(ADMIN);
    db.current = fakeSupabase({ users: ADMIN });
    const { requireMember } = await import('@/lib/server-auth');
    const res = await requireMember({ admin: true, tenantId: 'uuid-victim' });
    expect((res as NextResponse).status).toBe(403);
  });

  it('returns the member for an admin of the right tenant', async () => {
    signIn(ADMIN);
    db.current = fakeSupabase({ users: ADMIN });
    const { requireMember } = await import('@/lib/server-auth');
    const res = await requireMember({ admin: true, tenantId: 'uuid-acme' });
    expect(res).not.toBeInstanceOf(NextResponse);
    expect(res).toMatchObject({ userId: 'db-user-1', tenantId: 'uuid-acme' });
  });
});

describe('validateTenantContext', () => {
  it('requires authentication by default, so routes that pass no options are protected', async () => {
    const { validateTenantContext } = await import('@/lib/api-tenant-validation');
    const result = await validateTenantContext(req('/api/documents/upload', { headers: { 'x-tenant-subdomain': 'acme' } }));
    expect(result.isValid).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  it('ignores a forged x-user-id header', async () => {
    const { validateTenantContext } = await import('@/lib/api-tenant-validation');
    const result = await validateTenantContext(
      req('/api/chat', {
        headers: { 'x-tenant-subdomain': 'acme', 'x-user-id': 'user_victim', 'x-clerk-auth-status': 'signed-in' },
      }),
    );
    expect(result.isValid).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  it('rejects a signed-in user who is not a member of the named tenant', async () => {
    signIn(MEMBER);
    db.current = fakeSupabase({ users: { tenant_id: 'uuid-other' } });
    const { validateTenantContext } = await import('@/lib/api-tenant-validation');
    const result = await validateTenantContext(req('/api/chat', { headers: { 'x-tenant-subdomain': 'acme' } }));
    expect(result.statusCode).toBe(403);
  });
});

describe('PUT/DELETE /api/tenants/[tenantId]', () => {
  const params = { params: Promise.resolve({ tenantId: 'acme' }) };

  it('refuses an anonymous PUT and writes nothing', async () => {
    const { PUT } = await import('@/app/api/tenants/[tenantId]/route');
    const res = await PUT(req('/api/tenants/acme', { method: 'PUT', body: { plan_type: 'enterprise' } }), params);
    expect(res.status).toBe(401);
    expect(db.current!.writes).toEqual([]);
  });

  it('refuses a plain member', async () => {
    signIn(MEMBER);
    const { PUT } = await import('@/app/api/tenants/[tenantId]/route');
    const res = await PUT(req('/api/tenants/acme', { method: 'PUT', body: { name: 'x' } }), params);
    expect(res.status).toBe(403);
    expect(db.current!.writes).toEqual([]);
  });

  it('lets an admin change presentation fields but never plan or billing', async () => {
    signIn(ADMIN);
    db.current = fakeSupabase({ users: ADMIN, tenants: { id: 'uuid-acme', subdomain: 'acme' } });
    const { PUT } = await import('@/app/api/tenants/[tenantId]/route');
    const res = await PUT(
      req('/api/tenants/acme', {
        method: 'PUT',
        body: { name: 'Acme', plan_type: 'enterprise', subscription_status: 'active', subdomain: 'evil' },
      }),
      params,
    );
    expect(res.status).toBe(200);
    expect(db.current!.writes).toEqual([{ table: 'tenants', op: 'update', payload: { name: 'Acme' } }]);
  });

  it('refuses an anonymous DELETE and deletes nothing', async () => {
    const { DELETE } = await import('@/app/api/tenants/[tenantId]/route');
    const res = await DELETE(req('/api/tenants/acme', { method: 'DELETE' }), params);
    expect(res.status).toBe(401);
    expect(db.current!.writes).toEqual([]);
  });
});

describe('POST /api/onboarding/complete-atomic', () => {
  it('does not let an outsider join an existing tenant, even asking for admin', async () => {
    clerk.userId = 'user_attacker';
    clerk.publicMetadata = {};
    // The tenant exists; the attacker has no users row in it.
    db.current = fakeSupabase({ tenants: { id: 'uuid-acme' }, users: null });
    const { POST } = await import('@/app/api/onboarding/complete-atomic/route');
    const res = await POST(req('/api/onboarding/complete-atomic', { method: 'POST', body: { subdomain: 'acme', userRole: 'admin' } }));
    expect(res.status).toBe(409);
    expect(db.current!.writes).toEqual([]);
  });

  it('keeps a returning member at their existing role whatever userRole says', async () => {
    clerk.userId = 'user_member';
    db.current = fakeSupabase({ tenants: { id: 'uuid-acme' }, users: { id: 'db-user-1', role: 'member', access_level: 2 } });
    const { POST } = await import('@/app/api/onboarding/complete-atomic/route');
    const res = await POST(req('/api/onboarding/complete-atomic', { method: 'POST', body: { subdomain: 'acme', userRole: 'admin' } }));
    expect(res.status).toBe(200);
    const update = db.current!.writes.find((w) => w.table === 'users' && w.op === 'update');
    expect(update?.payload).toMatchObject({ role: 'member', access_level: 2 });
  });
});

describe('POST /api/users/invite', () => {
  it('refuses an anonymous invitation and returns no link', async () => {
    const { POST } = await import('@/app/api/users/invite/route');
    const res = await POST(
      req('/api/users/invite', {
        method: 'POST',
        body: { email: 'attacker@example.com', role: 'admin', accessLevel: 1, inviterName: 'x', tenantId: 'uuid-acme' },
      }),
    );
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toMatch(/invit.*url|token/i);
  });
});

describe('isTenantAdmin', () => {
  it('needs role admin AND access level 1, as the checks it replaced did', async () => {
    const { isTenantAdmin } = await import('@/lib/server-auth');
    expect(isTenantAdmin({ role: 'admin', accessLevel: 1 })).toBe(true);
    expect(isTenantAdmin({ role: 'admin', accessLevel: 2 })).toBe(false);
    expect(isTenantAdmin({ role: 'member', accessLevel: 1 })).toBe(false);
  });
});

describe('onboarding identity', () => {
  it('refuses a caller whose primary email is unverified, before any lookup by email', async () => {
    clerk.userId = 'user_member';
    clerk.emailVerified = false;
    db.current = fakeSupabase({ tenants: { id: 'uuid-acme' }, users: { id: 'db-user-1', role: 'admin', access_level: 1 } });
    const { POST } = await import('@/app/api/onboarding/complete-atomic/route');
    const res = await POST(req('/api/onboarding/complete-atomic', { method: 'POST', body: { subdomain: 'acme' } }));
    expect(res.status).toBe(403);
    expect(db.current!.writes).toEqual([]);
  });
});

describe('POST /api/tenant/[tenant]/settings', () => {
  const params = { params: Promise.resolve({ tenant: 'acme' }) };
  const body = { displayName: 'x', contactEmail: 'attacker@example.com', aiEnabled: false };

  it('refuses an anonymous caller and changes nothing', async () => {
    subdomain.current = { id: 'uuid-acme', subdomain: 'acme' };
    const { POST } = await import('@/app/api/tenant/[tenant]/settings/route');
    const res = await POST(req('/api/tenant/acme/settings', { method: 'POST', body }), params);
    expect(res.status).toBe(401);
    expect(subdomain.updates).toEqual([]);
  });

  it('refuses a plain member and changes nothing', async () => {
    signIn(MEMBER);
    subdomain.current = { id: 'uuid-acme', subdomain: 'acme' };
    const { POST } = await import('@/app/api/tenant/[tenant]/settings/route');
    const res = await POST(req('/api/tenant/acme/settings', { method: 'POST', body }), params);
    expect(res.status).toBe(403);
    expect(subdomain.updates).toEqual([]);
  });
});

describe('/api/notifications', () => {
  it('refuses an anonymous read of a tenant', async () => {
    const { GET } = await import('@/app/api/notifications/route');
    const res = await GET(req('/api/notifications?tenantId=uuid-acme'));
    expect(res.status).toBe(401);
  });

  it('refuses a member creating a notification, and writes nothing', async () => {
    signIn(MEMBER);
    const { POST } = await import('@/app/api/notifications/route');
    const res = await POST(
      req('/api/notifications', { method: 'POST', body: { tenantId: 'uuid-acme', title: 'Reset your password', message: 'x' } }),
    );
    expect(res.status).toBe(403);
    expect(db.current!.writes).toEqual([]);
  });

  it('refuses an admin acting on another tenant', async () => {
    signIn(ADMIN);
    db.current = fakeSupabase({ users: ADMIN });
    const { PATCH } = await import('@/app/api/notifications/route');
    const res = await PATCH(req('/api/notifications', { method: 'PATCH', body: { tenantId: 'uuid-victim', markAllAsRead: true } }));
    expect(res.status).toBe(403);
    expect(db.current!.writes).toEqual([]);
  });
});

describe('POST /api/auth/verify-admin', () => {
  it('does not answer for a named email with an unverified bearer token', async () => {
    const { POST } = await import('@/app/api/auth/verify-admin/route');
    const res = await POST(
      req('/api/auth/verify-admin', {
        method: 'POST',
        headers: { authorization: 'Bearer anything' },
        body: { email: 'ceo@acme.com', tenantId: 'uuid-acme' },
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe('/api/rag-metrics', () => {
  it("never lets a tenant admin clear every tenant's metrics", async () => {
    signIn(ADMIN);
    db.current = fakeSupabase({ users: ADMIN });
    const { DELETE } = await import('@/app/api/rag-metrics/route');
    const res = await DELETE();
    expect(res.status).toBe(403);
  });

  it("does not show a tenant admin other tenants' recent queries", async () => {
    signIn(ADMIN);
    db.current = fakeSupabase({ users: ADMIN });
    const { GET } = await import('@/app/api/rag-metrics/route');
    const res = await GET(req('/api/rag-metrics?view=recent', { headers: { 'x-tenant-subdomain': 'acme' } }));
    expect(res.status).toBe(403);
  });
});
