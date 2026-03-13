'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Mail, 
  Clock, 
  Check, 
  X, 
  UserPlus, 
  Shield, 
  AlertCircle,
  RefreshCw,
  Settings,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  access_level: number;
  status: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
  users?: {
    name: string;
    email: string;
  };
}

interface AccessRequest {
  id: string;
  user_email: string;
  user_name: string;
  requested_role: string;
  requested_access_level: number;
  status: string;
  request_reason: string;
  created_at: string;
  user_ip: string;
  user_agent: string;
}

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  access_level: number;
  created_at: string;
  last_login_at?: string;
}

interface InviteUserDialog {
  open: boolean;
  email: string;
  role: string;
  access_level: number;
  loading: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [currentUsers, setCurrentUsers] = useState<CurrentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  
  const [inviteDialog, setInviteDialog] = useState<InviteUserDialog>({
    open: false,
    email: '',
    role: 'user',
    access_level: 2,
    loading: false
  });

  // 🔒 SECURITY: Admin access check
  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Use database-based secure access check (NOT cookie-based)
      const { SchemaAlignedCookieManager } = await import('@/lib/schema-aligned-cookies');
      const secureAccess = await SchemaAlignedCookieManager.getSecureUserAccess();
      
      if (!secureAccess.isAdmin) {
        toast.error('Access Denied: Admin privileges required');
        router.push('/dashboard');
        return;
      }
      
      setIsAdmin(true);
      setAdminCheckComplete(true);
      loadUserData();
      
    } catch (error) {
      toast.error('Access verification failed');
      router.push('/dashboard');
    }
  };

  const loadUserData = async () => {
    try {
      setRefreshing(true);
      
      // Load all user management data in parallel
      const [invitationsRes, requestsRes, usersRes] = await Promise.all([
        fetch('/api/admin/pending-users'),
        fetch('/api/access-requests'),
        fetch('/api/admin/users')
      ]);

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        setPendingInvitations(data.pendingInvitations || []);
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setAccessRequests(data.accessRequests || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setCurrentUsers(data.users || []);
      }

    } catch (error) {
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteDialog.email || !inviteDialog.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setInviteDialog(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteDialog.email,
          role: inviteDialog.role,
          access_level: inviteDialog.access_level
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('User invitation sent successfully');
        setInviteDialog({ open: false, email: '', role: 'user', access_level: 2, loading: false });
        loadUserData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to send invitation');
      }

    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setInviteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleApproveInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}/approve`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Invitation approved');
        loadUserData();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to approve invitation');
      }
    } catch (error) {
      toast.error('Failed to approve invitation');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}/reject`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Invitation rejected');
        loadUserData();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to reject invitation');
      }
    } catch (error) {
      toast.error('Failed to reject invitation');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        toast.success('User role updated');
        loadUserData();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to update user role');
      }
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  // 🔒 SECURITY: Show access denied if not admin
  if (!adminCheckComplete || !isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">Administrator privileges required</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalPending = pendingInvitations.length + accessRequests.length;
  const totalUsers = currentUsers.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <Shield className="inline h-8 w-8 mr-2 text-blue-600" />
              Admin: User Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage team members, invitations, and access requests
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔒 ADMIN HEADER with Security Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Shield className="h-8 w-8 mr-2 text-blue-600" />
            Admin: User Management
            <Badge variant="destructive" className="ml-3">
              <Lock className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage team members, invitations, and access requests
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUserData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            onClick={() => setInviteDialog(prev => ({ ...prev, open: true }))}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
        </div>
      </div>

      {/* 🔒 ADMIN WARNING CARD */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Administrator Access Required
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Only administrators can manage users, send invitations, and approve access requests.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
            <p className="text-xs text-muted-foreground">
              {pendingInvitations.length} invitations, {accessRequests.length} requests
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentUsers.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">Administrator access</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentUsers.filter(u => u.role === 'user').length}
            </div>
            <p className="text-xs text-muted-foreground">Standard access</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Current Users ({totalUsers})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({totalPending})
            {totalPending > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {totalPending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({pendingInvitations.length})</TabsTrigger>
        </TabsList>

        {/* Current Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage existing users and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {user.name?.charAt(0) || user.email.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            <Shield className="h-3 w-3 mr-1" />
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Level {user.access_level}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user.last_login_at 
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {totalPending === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending user approvals</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Invitations</CardTitle>
                    <CardDescription>
                      Users invited but haven't accepted yet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">
                              {invitation.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{invitation.role}</Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(invitation.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <span className={new Date(invitation.expires_at) < new Date() ? 'text-red-600' : ''}>
                                {new Date(invitation.expires_at).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectInvitation(invitation.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Access Requests */}
              {accessRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Access Requests</CardTitle>
                    <CardDescription>
                      Users requesting access to the workspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {accessRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="font-medium">{request.user_name}</div>
                            <div className="text-sm text-muted-foreground">{request.user_email}</div>
                            <div className="text-sm text-muted-foreground">
                              Requested role: <Badge variant="outline">{request.requested_role}</Badge>
                            </div>
                            {request.request_reason && (
                              <div className="text-sm text-muted-foreground">
                                Reason: {request.request_reason}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="default">
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive">
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invitation History</CardTitle>
              <CardDescription>
                All sent invitations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No invitations sent yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{invitation.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={invitation.status === 'pending' ? 'secondary' : 'default'}
                          >
                            {invitation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={new Date(invitation.expires_at) < new Date() ? 'text-red-600' : ''}>
                            {new Date(invitation.expires_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialog.open} onOpenChange={(open) => 
        setInviteDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Shield className="inline h-5 w-5 mr-2" />
              Admin: Invite New User
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteDialog.email}
                onChange={(e) => setInviteDialog(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="w-full px-3 py-2 border border-input rounded-md"
                value={inviteDialog.role}
                onChange={(e) => setInviteDialog(prev => ({ 
                  ...prev, 
                  role: e.target.value,
                  access_level: e.target.value === 'admin' ? 1 : 2
                }))}
              >
                <option value="user">User - Standard access</option>
                <option value="admin">Admin - Full access</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteDialog(prev => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={inviteDialog.loading}
            >
              {inviteDialog.loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


