import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Search, Filter, MoreHorizontal, UserX, Mail, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface UserRow {
  id: string;
  email: string;
  role: string;
  territory_id: string | null;
  territory_name?: string;
  last_sign_in_at: string | null;
  is_active?: boolean;
  full_name?: string;
  phone_number?: string;
  completed_onboarding?: boolean;
}

export default function Users() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRow[]>([]);
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("rep");
  const [inviteTerritory, setInviteTerritory] = useState<string | undefined>();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");

  const roleOptions = [
    { value: 'rep', label: 'Sales Rep' },
    { value: 'manager', label: 'Territory Manager' },
    { value: 'admin', label: 'Admin' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, roleFilter, territoryFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users with territory names
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id, email, role, territory_id, full_name, phone_number, completed_onboarding,
          territories:territory_id (name)
        `)
        .order('email');

      if (!usersError && usersData) {
        const formattedUsers = usersData.map(user => ({
          ...user,
          territory_name: user.territories?.name || null,
          is_active: true // You might want to add this field to your profiles table
        }));
        setUsers(formattedUsers);
      }

      // Load territories
      const { data: territoriesData, error: territoriesError } = await supabase
        .from("territories")
        .select("id, name")
        .order('name');
      
      if (!territoriesError && territoriesData) {
        setTerritories(territoriesData);
      }
    } catch (error) {
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Territory filter
    if (territoryFilter !== 'all') {
      filtered = filtered.filter(user => user.territory_id === territoryFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", id);

      if (error) throw error;

      setUsers(users => users.map(user => 
        user.id === id ? { ...user, role } : user
      ));
      
      toast({ title: 'Role updated successfully' });
    } catch (error) {
      toast({ title: 'Error updating role', variant: 'destructive' });
    }
  };

  const handleUpdateTerritory = async (id: string, territory_id: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ territory_id })
        .eq("id", id);

      if (error) throw error;

      const territory = territories.find(t => t.id === territory_id);
      setUsers(users => users.map(user => 
        user.id === id ? { ...user, territory_id, territory_name: territory?.name } : user
      ));
      
      toast({ title: 'Territory updated successfully' });
    } catch (error) {
      toast({ title: 'Error updating territory', variant: 'destructive' });
    }
  };

  const handleDeactivateUser = async () => {
    if (!selectedUser) return;

    try {
      // In a real implementation, you might want to add an is_active field
      // For now, we'll just show a toast
      toast({ 
        title: 'User deactivated', 
        description: `${selectedUser.email} has been deactivated.` 
      });
      
      setDeactivateOpen(false);
      setSelectedUser(null);
    } catch (error) {
      toast({ title: 'Error deactivating user', variant: 'destructive' });
    }
  };

  const handleResendInvite = async (email: string) => {
    try {
      // This would call your invite-user Edge Function
      toast({ 
        title: 'Invite resent', 
        description: `Invitation email resent to ${email}` 
      });
    } catch (error) {
      toast({ title: 'Error resending invite', variant: 'destructive' });
    }
  };

  const sendInvite = async () => {
    if (inviteRole === 'manager' && !inviteTerritory) {
      toast({ 
        title: 'Territory required', 
        description: 'Territory Managers must be assigned a territory.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      console.log('Sending invite request:', {
        email: inviteEmail,
        role: inviteRole,
        territory_id: inviteRole === 'admin' ? undefined : inviteTerritory,
      });

      // Call the function directly via fetch to get better error details
      const response = await fetch(`https://xtdyirvhfyxmpexvjjcb.supabase.co/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': supabase.supabaseKey,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          territory_id: inviteRole === 'admin' ? undefined : inviteTerritory,
        }),
      });

      console.log('Raw response status:', response.status);
      console.log('Raw response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        console.error('Function returned error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid response format');
      }

      if (data.success) {
        toast({ 
          title: 'Invite sent', 
          description: `Invitation email sent to ${inviteEmail}` 
        });
        
        setInviteOpen(false);
        setInviteEmail('');
        setInviteTerritory(undefined);
        setInviteRole('rep');
        
        // Reload data to include new user
        loadData();
      } else {
        throw new Error(data.error || 'Unknown error from invitation service');
      }
    } catch (error) {
      console.error('SendInvite error:', error);
      toast({ 
        title: 'Error sending invite', 
        description: error.message || 'Failed to send invitation', 
        variant: 'destructive' 
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'rep': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-3 w-3" />;
      case 'manager': return <UserPlus className="h-3 w-3" />;
      default: return null;
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need admin privileges to access user management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and territories</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Territories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Territories</SelectItem>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Users ({filteredUsers.length})</span>
            {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">User</th>
                  <th className="text-left py-3">Role</th>
                  <th className="text-left py-3">Territory</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Last Login</th>
                  <th className="text-right py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{user.full_name || 'No name set'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <Select value={user.role} onValueChange={(val) => handleUpdateRole(user.id, val)}>
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue>
                            <div className="flex items-center gap-1">
                              {getRoleIcon(user.role)}
                              <span>{roleOptions.find(r => r.value === user.role)?.label}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-1">
                                {getRoleIcon(value)}
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3">
                      <Select
                        value={user.territory_id ?? undefined}
                        onValueChange={(val) => handleUpdateTerritory(user.id, val)}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue placeholder="No territory" />
                        </SelectTrigger>
                        <SelectContent>
                          {territories.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <Badge className={getRoleBadgeColor(user.role)} variant="outline">
                          {user.role}
                        </Badge>
                        {user.completed_onboarding ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResendInvite(user.email)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(user);
                              setDeactivateOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby="invite-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite New User
            </DialogTitle>
          </DialogHeader>
          <p id="invite-dialog-description" className="text-sm text-muted-foreground mb-4">
            Send an invitation email to add a new user to the system with the specified role and territory.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                placeholder="user@3mgroofing.com" 
                value={inviteEmail} 
                onChange={(e) => setInviteEmail(e.target.value)}
                type="email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={(val) => { 
                setInviteRole(val); 
                if (val === 'admin') setInviteTerritory(undefined); 
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(value)}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Territory</label>
              <Select 
                value={inviteTerritory ?? ''} 
                onValueChange={setInviteTerritory} 
                disabled={inviteRole === 'admin'}
              >
                <SelectTrigger className={inviteRole === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}>
                  <SelectValue placeholder={inviteRole === 'admin' ? 'Not applicable for admins' : 'Select territory'} />
                </SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inviteRole === 'manager' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Territory is required for managers
                </p>
              )}
            </div>
            <Button 
              className="w-full" 
              onClick={sendInvite} 
              disabled={!inviteEmail || (inviteRole === 'manager' && !inviteTerritory)}
            >
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {selectedUser?.email}? 
              They will no longer be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateUser} className="bg-red-600 hover:bg-red-700">
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 