"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  Activity, 
  Database,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import AdminDashboardLayout from '@/components/admin/admin-dashboard-layout';

interface AdminMetrics {
  users: {
    total: number;
    active: number;
    pending: number;
    adminCount: number;
  };
  approvals: {
    pending: number;
    approved: number;
    rejected: number;
  };
  system: {
    health: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastBackup: string;
  };
  activity: {
    todayLogins: number;
    documentsUploaded: number;
    chatInteractions: number;
  };
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({
    name: 'Admin User',
    email: 'admin@example.com',
    avatar: '/placeholder.svg',
    role: 'admin',
    access_level: 1,
    tenant: {
      name: 'Example Company',
      subdomain: 'example'
    }
  });

  useEffect(() => {
    loadAdminMetrics();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get user data from session
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const sessionData = await response.json();
        if (sessionData.authenticated && sessionData.user) {
          setUser({
            name: sessionData.user.name || 'Admin User',
            email: sessionData.user.email || 'admin@example.com',
            avatar: sessionData.user.avatar || '/placeholder.svg',
            role: sessionData.user.role || 'admin',
            access_level: sessionData.user.access_level || 1,
            tenant: sessionData.tenant || {
              name: 'Example Company',
              subdomain: 'example'
            }
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadAdminMetrics = async () => {
    try {
      setLoading(true);
      
      // Load various admin metrics
      const [usersResponse, pendingResponse] = await Promise.all([
        fetch('/api/admin/users-summary'),
        fetch('/api/admin/pending-users')
      ]);

      let usersData = { total: 0, active: 0, pending: 0, adminCount: 0 };
      let approvalsData = { pending: 0, approved: 0, rejected: 0 };

      if (usersResponse.ok) {
        const users = await usersResponse.json();
        usersData = users.data || usersData;
      }

      if (pendingResponse.ok) {
        const pending = await pendingResponse.json();
        approvalsData.pending = pending.data?.summary?.totalPending || 0;
      }

      setMetrics({
        users: usersData,
        approvals: approvalsData,
        system: {
          health: 'healthy',
          uptime: 99.9,
          lastBackup: new Date().toISOString()
        },
        activity: {
          todayLogins: usersData.active || 0,
          documentsUploaded: 0,
          chatInteractions: 0
        }
      });

    } catch (error) {
      // Set default metrics for demo
      setMetrics({
        users: { total: 0, active: 0, pending: 0, adminCount: 1 },
        approvals: { pending: 0, approved: 0, rejected: 0 },
        system: { health: 'warning', uptime: 99.5, lastBackup: new Date().toISOString() },
        activity: { todayLogins: 0, documentsUploaded: 0, chatInteractions: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!user.role || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="access-denied">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Admin privileges required to access this page.</p>
          <Button asChild data-testid="return-to-dashboard">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between" data-testid="admin-header">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="admin-title">
              Admin Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              System administration and management dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="px-3 py-1" data-testid="admin-badge">
              <Shield className="h-3 w-3 mr-1" />
              Admin Access
            </Badge>
            <Button onClick={loadAdminMetrics} variant="outline" disabled={loading} data-testid="refresh-button">
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Users */}
              <Card data-testid="total-users-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="total-users-count">{metrics?.users.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.users.active} active users
                  </p>
                </CardContent>
              </Card>

              {/* Pending Approvals */}
              <Card data-testid="pending-approvals-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600" data-testid="pending-approvals-count">
                    {metrics?.approvals.pending}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting admin review
                  </p>
                  {metrics?.approvals.pending > 0 && (
                    <Button asChild size="sm" className="mt-2" data-testid="review-approvals-button">
                      <Link href="/dashboard/admin/users">Review Now</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge className={getHealthColor(metrics?.system.health || 'warning')}>
                      {metrics?.system.health || 'Warning'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {metrics?.system.uptime}% uptime
                  </p>
                </CardContent>
              </Card>

              {/* Today's Activity */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.activity.todayLogins}</div>
                  <p className="text-xs text-muted-foreground">
                    User logins today
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Management Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Overview of user accounts and access levels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Admin Users</span>
                    <Badge variant="outline">{metrics?.users.adminCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Standard Users</span>
                    <Badge variant="outline">
                      {(metrics?.users.total || 0) - (metrics?.users.adminCount || 0)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Users</span>
                    <Badge variant="destructive">{metrics?.users.pending}</Badge>
                  </div>
                  <Button asChild className="w-full mt-4">
                    <Link href="/dashboard/admin/users">Manage Users</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Activity
                  </CardTitle>
                  <CardDescription>
                    Recent system usage and performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Documents Uploaded</span>
                    <span className="font-medium">{metrics?.activity.documentsUploaded}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chat Interactions</span>
                    <span className="font-medium">{metrics?.activity.chatInteractions}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>System Uptime</span>
                      <span>{metrics?.system.uptime}%</span>
                    </div>
                    <Progress value={metrics?.system.uptime} className="h-2" />
                  </div>
                  <Button asChild variant="outline" className="w-full mt-4">
                    <Link href="/dashboard/admin/system-health">View Details</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button asChild variant="outline" className="flex flex-col h-20">
                    <Link href="/dashboard/admin/users">
                      <Users className="h-6 w-6 mb-1" />
                      <span className="text-xs">Manage Users</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex flex-col h-20">
                    <Link href="/dashboard/admin/system-health">
                      <Shield className="h-6 w-6 mb-1" />
                      <span className="text-xs">System Health</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex flex-col h-20">
                    <Link href="/dashboard/settings">
                      <Database className="h-6 w-6 mb-1" />
                      <span className="text-xs">Settings</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex flex-col h-20">
                    <Link href="/dashboard/support">
                      <Activity className="h-6 w-6 mb-1" />
                      <span className="text-xs">Support</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
