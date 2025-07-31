import { getAllSubdomains } from '@/lib/subdomains';
import type { Metadata } from 'next';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';

// Force dynamic rendering for Redis operations
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: `Admin Dashboard | ${rootDomain}`,
  description: `Manage subdomains for ${rootDomain}`
};

import { requirePlatformAdmin } from '@/lib/platform-auth';
import { NextRequest } from 'next/server';

export default async function AdminPage() {
  // Note: In a real app, you'd handle this in middleware
  // For now, we handle it client-side in the dashboard component
  const tenants = await getAllSubdomains();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <AdminDashboard tenants={tenants} />
    </div>
  );
}
