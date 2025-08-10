'use client'

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Shield, Users, Building } from 'lucide-react';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantInfo: {
    currentUsers: number;
    maxUsers: number;
    planType: string;
  };
}

const ACCESS_LEVELS = {
  1: { name: 'Public Access', description: 'Basic documents and info', color: 'bg-green-100 text-green-800' },
  2: { name: 'Customer Access', description: 'Customer-specific content', color: 'bg-blue-100 text-blue-800' },
  3: { name: 'Employee Access', description: 'Internal procedures and data', color: 'bg-purple-100 text-purple-800' },
  4: { name: 'Manager Access', description: 'Financial and operational data', color: 'bg-orange-100 text-orange-800' },
  5: { name: 'Executive Access', description: 'All sensitive information', color: 'bg-red-100 text-red-800' }
};

const DEPARTMENTS = [
  'Sales', 'Service', 'Parts', 'Finance', 'Management', 'Operations', 'Customer Service', 'IT', 'HR'
];

export default function InviteUserModal({ isOpen, onClose, tenantInfo }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<number>(3);
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('user');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const canInviteMore = tenantInfo.currentUsers < tenantInfo.maxUsers;

  const handleInvite = async () => {
    if (!email || !department || !accessLevel) {
      setError('Please fill in all required fields');
      return;
    }

    if (!canInviteMore) {
      setError(`You've reached your user limit (${tenantInfo.maxUsers}). Upgrade your plan to invite more users.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Call backend to send invitation
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          accessLevel,
          department,
          role
        })
      });

      if (response.ok) {
        // Success - reset form and close
        setEmail('');
        setAccessLevel(3);
        setDepartment('');
        setRole('user');
        onClose();
        
        // Show success message (you can add toast notification here)
        alert(`Invitation sent to ${email}!`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send invitation');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization with specific access permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Limit Warning */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant={canInviteMore ? "default" : "destructive"}>
                {tenantInfo.currentUsers}/{tenantInfo.maxUsers} users
              </Badge>
              <span className="text-sm text-muted-foreground">
                {tenantInfo.planType} plan
              </span>
            </div>
            {!canInviteMore && (
              <Button variant="outline" size="sm">
                Upgrade Plan
              </Button>
            )}
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={!canInviteMore}
              />
            </div>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={setDepartment} disabled={!canInviteMore}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <SelectValue placeholder="Select department" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Access Level */}
          <div className="space-y-2">
            <Label htmlFor="access-level">Access Level</Label>
            <Select value={accessLevel.toString()} onValueChange={(value) => setAccessLevel(parseInt(value))} disabled={!canInviteMore}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCESS_LEVELS).map(([level, info]) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center gap-2">
                      <Badge className={info.color}>Level {level}</Badge>
                      <div>
                        <div className="font-medium">{info.name}</div>
                        <div className="text-xs text-muted-foreground">{info.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={!canInviteMore}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                <SelectItem value="user">User (Standard access)</SelectItem>
                <SelectItem value="manager">Manager (Team oversight)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvite} 
            disabled={isLoading || !canInviteMore}
            className="gap-2"
          >
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 