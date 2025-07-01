import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTerritories, createTerritory, updateTerritory, deleteTerritory, Territory } from "@/api/territories";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2 } from "lucide-react";

export default function Territories() {
  const { toast } = useToast();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    const { data, error } = await getTerritories();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTerritories(data);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { error } = await createTerritory(newName.trim());
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Territory created" });
      setNewName("");
      fetchData();
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const { error } = await updateTerritory(editingId, editingName.trim());
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Territory updated" });
      setEditingId(null);
      setEditingName("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this territory?")) return;
    const { error } = await deleteTerritory(id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Territory deleted" });
      fetchData();
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Territories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* New territory form */}
            <div className="flex gap-2">
              <Input
                placeholder="New territory name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={!newName.trim()}>Add</Button>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
              </div>
            ) : (
              <ul className="divide-y border rounded-md">
                {territories.map((t) => (
                  <li key={t.id} className="p-4 flex items-center justify-between gap-4">
                    {editingId === t.id ? (
                      <>
                        <Input value={editingName} onChange={(e)=>setEditingName(e.target.value)} className="flex-1" />
                        <Button size="sm" onClick={handleUpdate} disabled={!editingName.trim()}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={()=>setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{t.name}</span>
                        <Button size="icon" variant="outline" onClick={()=>{setEditingId(t.id!); setEditingName(t.name);}}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={()=>handleDelete(t.id!)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 