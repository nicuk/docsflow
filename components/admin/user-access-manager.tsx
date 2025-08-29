'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

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
}

interface PendingUsersData {
  pendingInvitations: PendingInvitation[];
  accessRequests: AccessRequest[];
  currentUsers: CurrentUser[];
  tenant: {
    name: string;
    subdomain: string;
    settings: any;
  };
  summary: {
    totalPending: number;
    pendingInvitations: number;
    accessRequests: number;
    currentUsers: number;
    userLimit: number;
  };
}

interface ActionDialog {
  open: boolean;
  type: 'invitation' | 'access_request';
  action: 'approve' | 'reject';
  item: PendingInvitation | AccessRequest | null;
}

export function UserAccessManager() {
  const [data, setData] = useState<PendingUsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog>({
    open: false,
    type: 'invitation',
    action: 'approve',
    item: null
  });
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pending-users');
      if (!response.ok) {
        throw new Error('Failed to fetch pending users');
      }
      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionDialog.item) return;

    try {
      setProcessing(true);
      const response = await fetch('/api/admin/pending-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionDialog.action,
          type: actionDialog.type,
          id: actionDialog.item.id,
          reason: actionReason
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process action');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Refresh data
      await fetchPendingUsers();
      
      // Close dialog
      setActionDialog({ open: false, type: 'invitation', action: 'approve', item: null });
      setActionReason('');

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const openActionDialog = (
    type: 'invitation' | 'access_request',
    action: 'approve' | 'reject',
    item: PendingInvitation | AccessRequest
  ) => {
    setActionDialog({ open: true, type, action, item });
    setActionReason('');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelIcon = (level: number) => {
    if (level === 1) return <Shield className="h-4 w-4 text-red-500" />;
    if (level <= 3) return <Users className="h-4 w-4 text-blue-500" />;
    return <UserPlus className="h-4 w-4 text-green-500" />;
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading User Access Requests...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error Loading User Requests
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchPendingUsers} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{data.summary.totalPending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Users</p>
                <p className="text-2xl font-bold">{data.summary.currentUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">User Limit</p>
                <p className="text-2xl font-bold">{data.summary.userLimit}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Invitations</p>
                <p className="text-2xl font-bold">{data.summary.pendingInvitations}</p>
              </div>
              <Mail className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {data.pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations ({data.pendingInvitations.length})
            </CardTitle>
            <CardDescription>
              Users who have been invited but haven't accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {invitation.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-muted-foreground">Pending Invitation</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAccessLevelIcon(invitation.access_level)}
                        Level {invitation.access_level}
                      </div>
                    </TableCell>
                    <TableCell>
                      {invitation.users?.name || 'System'}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog('invitation', 'approve', invitation)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog('invitation', 'reject', invitation)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
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
      {data.accessRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Access Requests ({data.accessRequests.length})
            </CardTitle>
            <CardDescription>
              Users requesting access to your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accessRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {request.user_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.user_name}</p>
                          <p className="text-sm text-muted-foreground">{request.user_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(request.requested_role)}>
                        {request.requested_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAccessLevelIcon(request.requested_access_level)}
                        Level {request.requested_access_level}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-xs truncate">{request.request_reason}</p>
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog('access_request', 'approve', request)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog('access_request', 'reject', request)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
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

      {/* No pending requests */}
      {data.summary.totalPending === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">No Pending Requests</h3>
                <p className="text-sm text-muted-foreground">
                  All user access requests have been processed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchPendingUsers} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => 
        setActionDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' ? 'Approve' : 'Reject'} User Access
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'approve' 
                ? 'This will grant the user access to your organization.'
                : 'This will deny the user access and they will be notified.'}
            </DialogDescription>
          </DialogHeader>
          
          {actionDialog.item && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {('email' in actionDialog.item 
                        ? actionDialog.item.email 
                        : actionDialog.item.user_email
                      ).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {'user_name' in actionDialog.item 
                        ? actionDialog.item.user_name 
                        : actionDialog.item.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {'email' in actionDialog.item 
                        ? actionDialog.item.email 
                        : actionDialog.item.user_email}
                    </p>
                  </div>
                </div>
              </div>

              {actionDialog.action === 'reject' && (
                <div>
                  <label className="text-sm font-medium">
                    Reason for rejection (optional)
                  </label>
                  <Textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Provide a reason for the rejection..."
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionDialog.action === 'approve' ? 'default' : 'destructive'}
            >
              {processing && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {actionDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
