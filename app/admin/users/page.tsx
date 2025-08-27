'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib-frontend/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Users, Shield, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  tenant_id: string;
  metadata?: {
    department?: string;
    requested_access?: string;
    notes?: string;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTenant, setCurrentTenant] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createSupabaseClient();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();

      if (userError || userData?.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: 'You must be an admin to access this page',
          variant: 'destructive',
        });
        window.location.href = '/dashboard';
        return;
      }

      setIsAdmin(true);
      setCurrentTenant(userData.tenant_id);
      
      // Load users for this tenant
      await loadUsers(userData.tenant_id);
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify admin access',
        variant: 'destructive',
      });
    }
  };

  const loadUsers = async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', userId);

      if (error) throw error;

      // Send approval email (would integrate with email service)
      await sendApprovalEmail(userId);

      toast({
        title: 'User Approved',
        description: 'User has been approved and notified',
      });

      await loadUsers(currentTenant);
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve user',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (userId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: reason
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'User Rejected',
        description: 'User access has been denied',
      });

      await loadUsers(currentTenant);
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject user',
        variant: 'destructive',
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole}`,
      });

      await loadUsers(currentTenant);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const sendApprovalEmail = async (userId: string) => {
    // This would integrate with your email service (SendGrid, Resend, etc.)
    // For now, just log it
    console.log(`Sending approval email to user ${userId}`);
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">Approve, reject, and manage user access for your organization</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending user approvals</p>
              </CardContent>
            </Card>
          ) : (
            pendingUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{user.full_name || 'No name'}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Requested</p>
                      <p className="text-sm font-medium">
                        {format(new Date(user.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Requested Role</p>
                      <p className="text-sm font-medium capitalize">{user.role || 'member'}</p>
                    </div>
                    {user.metadata?.department && (
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="text-sm font-medium">{user.metadata.department}</p>
                      </div>
                    )}
                    {user.metadata?.notes && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{user.metadata.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(user.id)}
                      className="flex-1"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      onClick={() => handleReject(user.id)}
                      className="flex-1"
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedUsers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No approved users yet</p>
              </CardContent>
            </Card>
          ) : (
            approvedUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{user.full_name || 'No name'}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                      <Badge variant="outline">
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Approved on {format(new Date(user.created_at), 'MMM dd, yyyy')}
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="px-3 py-1 border rounded-md text-sm"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(user.id, 'Access revoked by admin')}
                      >
                        Revoke Access
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedUsers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No rejected users</p>
              </CardContent>
            </Card>
          ) : (
            rejectedUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{user.full_name || 'No name'}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Rejected on {format(new Date(user.created_at), 'MMM dd, yyyy')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(user.id)}
                    >
                      Reconsider
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
