import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface Property {
  id: string;
  name: string;
  location: string;
  description: string;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  availability_status: boolean;
  created_at: string;
}

const emptyForm = { name: "", location: "", description: "", price_per_night: "", max_guests: "2", amenities: "", availability_status: true };

const PropertiesManagement = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProperties = async () => {
    const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    setProperties((data as Property[]) || []);
  };

  useEffect(() => { fetchProperties(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Property) => {
    setEditing(p);
    setForm({
      name: p.name, location: p.location, description: p.description,
      price_per_night: String(p.price_per_night), max_guests: String(p.max_guests),
      amenities: p.amenities?.join(", ") || "", availability_status: p.availability_status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name, location: form.location, description: form.description,
      price_per_night: Number(form.price_per_night), max_guests: Number(form.max_guests),
      amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      availability_status: form.availability_status,
    };

    if (editing) {
      const { error } = await supabase.from("properties").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Property updated" });
    } else {
      const { error } = await supabase.from("properties").insert(payload);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Property added" });
    }
    setDialogOpen(false);
    fetchProperties();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Property deleted" });
    fetchProperties();
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await supabase.from("properties").update({ availability_status: !current }).eq("id", id);
    fetchProperties();
  };

  const filtered = properties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Properties</h1>
          <p className="text-sm text-muted-foreground">Manage staycation property listings</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Property</Button>
      </div>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price/Night</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Guests</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Available</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No properties found</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.location}</td>
                <td className="px-4 py-3">₱{Number(p.price_per_night).toLocaleString()}</td>
                <td className="px-4 py-3">{p.max_guests}</td>
                <td className="px-4 py-3">
                  <Switch checked={p.availability_status} onCheckedChange={() => toggleAvailability(p.id, p.availability_status)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Property" : "Add Property"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price/Night (₱)</Label><Input type="number" value={form.price_per_night} onChange={(e) => setForm({ ...form, price_per_night: e.target.value })} /></div>
              <div><Label>Max Guests</Label><Input type="number" value={form.max_guests} onChange={(e) => setForm({ ...form, max_guests: e.target.value })} /></div>
            </div>
            <div><Label>Amenities (comma-separated)</Label><Input placeholder="WiFi, Pool, Aircon, Kitchen" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.availability_status} onCheckedChange={(v) => setForm({ ...form, availability_status: v })} />
              <Label>Available for booking</Label>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Update Property" : "Add Property"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertiesManagement;
