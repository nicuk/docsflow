import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side identity for API routes.
 *
 * Identity comes from Clerk's verified session (`auth()`), never from request
 * headers. Headers such as `x-user-id` and `x-tenant-id` are sent by the
 * browser, so anything read from them is a claim, not a fact. The tenant a
 * caller may act on is the one recorded on their `users` row.
 */

export interface VerifiedMember {
  /** Supabase `users.id` (UUID), mapped from the Clerk user. */
  userId: string;
  clerkUserId: string;
  email: string | null;
  tenantId: string;
  role: string | null;
  accessLevel: number | null;
}

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Admin is role 'admin' or access level 1, the convention used across the app. */
export function isTenantAdmin(member: Pick<VerifiedMember, 'role' | 'accessLevel'>): boolean {
  return member.role === 'admin' || member.accessLevel === 1;
}

/**
 * The signed-in caller and their tenant membership, or null when there is no
 * verified session or no `users` row for it.
 */
export async function getVerifiedMember(): Promise<VerifiedMember | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkUserId);
  const supabaseUserId = clerkUser.publicMetadata?.supabaseUserId as string | undefined;
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
  if (!supabaseUserId) return null;

  const { data } = await adminClient()
    .from('users')
    .select('id, tenant_id, role, access_level')
    .eq('id', supabaseUserId)
    .maybeSingle();
  if (!data?.tenant_id) return null;

  return {
    userId: data.id,
    clerkUserId,
    email,
    tenantId: data.tenant_id,
    role: data.role ?? null,
    accessLevel: data.access_level ?? null,
  };
}

/**
 * Require a signed-in member, optionally an admin, optionally of a specific
 * tenant. Returns the member, or a ready 401/403 response to return as-is:
 *
 *   const member = await requireMember({ admin: true });
 *   if (member instanceof NextResponse) return member;
 */
export async function requireMember(
  opts: { admin?: boolean; tenantId?: string | null; headers?: HeadersInit } = {},
): Promise<VerifiedMember | NextResponse> {
  const member = await getVerifiedMember();
  if (!member) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: opts.headers });
  }
  if (opts.tenantId && opts.tenantId !== member.tenantId) {
    return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403, headers: opts.headers });
  }
  if (opts.admin && !isTenantAdmin(member)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: opts.headers });
  }
  return member;
}
