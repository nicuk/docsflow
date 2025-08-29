'use client';

import { UserAccessManager } from '@/components/admin/user-access-manager';

export default function DashboardAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Access Management</h1>
        <p className="text-muted-foreground mt-2">
          Approve, reject, and manage user access requests for your organization
        </p>
      </div>
      
      <UserAccessManager />
    </div>
  );
}
