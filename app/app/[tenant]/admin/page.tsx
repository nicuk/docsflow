import { notFound } from 'next/navigation';
import { getSubdomainData } from '@/lib/subdomains';
import { TenantAdminDashboard } from './dashboard';

interface TenantAdminPageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function TenantAdminPage({ params }: TenantAdminPageProps) {
  const { tenant } = await params;

  // Verify tenant exists
  const tenantData = await getSubdomainData(tenant);
  
  if (!tenantData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantAdminDashboard tenant={tenant} tenantData={tenantData} />
    </div>
  );
}