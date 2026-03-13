"use client"

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Shield, 
  Settings, 
  BarChart3, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  name: string;
  email: string;
  avatar: string;
  role: string;
  access_level: number;
  tenant: {
    name: string;
    subdomain: string;
  };
}

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  user: AdminUser;
}

const adminNavigationItems = [
  { 
    name: 'Admin Overview', 
    href: '/dashboard/admin', 
    icon: BarChart3, 
    badge: null,
    description: 'System overview and metrics' 
  },
  { 
    name: 'User Management', 
    href: '/dashboard/admin/users', 
    icon: Users, 
    badge: null,
    description: 'Manage users, roles, and access' 
  },
  { 
    name: 'System Health', 
    href: '/dashboard/admin/system-health', 
    icon: Shield, 
    badge: null,
    description: 'Monitor system performance' 
  },
  { 
    name: 'Settings', 
    href: '/dashboard/settings', 
    icon: Settings, 
    badge: null,
    description: 'Workspace configuration and preferences' 
  },
];

export default function AdminDashboardLayout({ children, user }: AdminDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Verify admin access on component mount
  useEffect(() => {
    verifyAdminAccess();
    loadAdminMetrics();
  }, []);

  const verifyAdminAccess = async () => {
    try {
      // Check if user has admin privileges
      if (user.role !== 'admin' || user.access_level !== 1) {
        toast.error('Access Denied: Admin privileges required');
        router.push('/dashboard');
        return;
      }

      // Additional backend verification
      const response = await fetch('/api/admin/verify', {
        headers: {
          'x-tenant-id': user.tenant?.subdomain || '',
          'x-user-email': user.email
        }
      });

      if (!response.ok) {
        throw new Error('Admin verification failed');
      }

      setIsVerified(true);
      
    } catch (error) {
      toast.error('Admin access verification failed');
      router.push('/dashboard');
    }
  };

  const loadAdminMetrics = async () => {
    try {
      // Load pending approvals count
      const pendingResponse = await fetch('/api/admin/pending-users', {
        headers: {
          'x-tenant-id': user.tenant?.subdomain || '',
          'x-user-email': user.email
        }
      });

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingCount(pendingData.data?.summary?.totalPending || 0);
      }

      // Load alerts count (placeholder)
      setAlertsCount(0);

    } catch (_error) {
      console.error('Failed to load admin metrics:', _error);
    }
  };

  const getBadgeCount = (badgeType: string) => {
    switch (badgeType) {
      case 'pending':
        return pendingCount > 0 ? pendingCount.toString() : null;
      case 'alerts':
        return alertsCount > 0 ? alertsCount.toString() : null;
      default:
        return null;
    }
  };

  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Sidebar */}
      <aside className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-72'
      }`}>
        {/* Admin Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Admin Panel</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.tenant.name}</p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Admin Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-1">
            {adminNavigationItems.map((item) => {
              const isActive = pathname === item.href;
              const badgeCount = item.badge ? getBadgeCount(item.badge) : null;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isActive
                      ? 'bg-red-50 text-red-700 border-l-4 border-red-500 dark:bg-red-900/20 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  title={isCollapsed ? item.description : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  
                  {!isCollapsed && (
                    <>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.description}
                        </div>
                      </div>
                      
                      {badgeCount && (
                        <Badge variant="destructive" className="ml-auto">
                          {badgeCount}
                        </Badge>
                      )}
                    </>
                  )}
                  
                  {isCollapsed && badgeCount && (
                    <div className="absolute left-12 top-2 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{badgeCount}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Admin User Info */}
        {!isCollapsed && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    Admin
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-3 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs"
                onClick={() => router.push('/dashboard')}
              >
                User View
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs"
                onClick={() => router.push('/dashboard/settings')}
              >
                Settings
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}




