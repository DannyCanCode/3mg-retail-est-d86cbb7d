import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface UserRow {
  id: string;
  email: string;
  role: string;
  territory_id: string | null;
  last_sign_in_at: string | null;
}

export default function Users() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("rep");
  const [inviteTerritory, setInviteTerritory] = useState<string | undefined>();

  useEffect(() => {
    const load = async () => {
      const { data: t } = await supabase.from("territories").select();
      setTerritories(t ?? []);

      const { data, error } = await supabase.rpc("admin_list_users");
      if (!error) setUsers(data as any);
    };
    load();
  }, []);

  const handleUpdateRole = async (id: string, role: string) => {
    await supabase.from("profiles").update({ role }).eq("id", id);
    setUsers((u) => u.map((row) => (row.id === id ? { ...row, role } : row)));
  };

  const handleUpdateTerritory = async (id: string, territory_id: string) => {
    await supabase.from("profiles").update({ territory_id }).eq("id", id);
    setUsers((u) => u.map((row) => (row.id === id ? { ...row, territory_id } : row)));
  };

  const sendInvite = async () => {
    const { error } = await supabase.functions.invoke("invite-user", {
      body: {
        email: inviteEmail,
        role: inviteRole,
        territory_id: inviteTerritory,
      },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invite sent", description: `Invitation e-mail sent to ${inviteEmail}` });
      setOpen(false);
      setInviteEmail("");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onClick={() => setOpen(true)}>Invite User</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Territory</th>
                  <th className="text-left py-2">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-muted/50">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">
                      <Select value={u.role} onValueChange={(val) => handleUpdateRole(u.id, val)}>
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {['admin', 'manager', 'materials_mgr', 'rep'].map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2">
                      <Select
                        value={u.territory_id ?? undefined}
                        onValueChange={(val) => handleUpdateTerritory(u.id, val)}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue placeholder="Territory" />
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
                    <td className="py-2 text-muted-foreground text-xs">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="email@3mgroofing.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {['rep', 'manager', 'materials_mgr', 'admin'].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={inviteTerritory} onValueChange={setInviteTerritory}>
              <SelectTrigger>
                <SelectValue placeholder="All Territories (optional)" />
              </SelectTrigger>
              <SelectContent>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={sendInvite} disabled={!inviteEmail}>
              Send Invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 