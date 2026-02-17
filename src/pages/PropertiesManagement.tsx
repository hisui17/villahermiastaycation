import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, Search, CalendarDays } from "lucide-react";

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
const emptyBookingForm = { guest_name: "", property_id: "", num_guests: "1", check_in_date: "", check_out_date: "", price_per_night: "" };

const PropertiesManagement = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);

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

  const openBooking = (p?: Property) => {
    setBookingForm({
      ...emptyBookingForm,
      property_id: p?.id || "",
      price_per_night: p ? String(p.price_per_night) : "",
    });
    setBookingDialogOpen(true);
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

  const handleSaveBooking = async () => {
    if (!bookingForm.guest_name || !bookingForm.property_id || !bookingForm.check_in_date || !bookingForm.check_out_date) {
      return toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
    }
    const checkIn = new Date(bookingForm.check_in_date);
    const checkOut = new Date(bookingForm.check_out_date);
    if (checkOut <= checkIn) {
      return toast({ title: "Invalid dates", description: "Check-out must be after check-in", variant: "destructive" });
    }
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * Number(bookingForm.price_per_night);

    const { error } = await supabase.from("bookings").insert({
      guest_name: bookingForm.guest_name,
      property_id: bookingForm.property_id,
      num_guests: Number(bookingForm.num_guests),
      check_in_date: bookingForm.check_in_date,
      check_out_date: bookingForm.check_out_date,
      total_price: totalPrice,
      booking_status: "confirmed",
      user_id: user?.id || null,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Booking created", description: `${nights} night(s) — ₱${totalPrice.toLocaleString()}` });
    setBookingDialogOpen(false);
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

  const selectedProperty = properties.find((p) => p.id === bookingForm.property_id);
  const nights = bookingForm.check_in_date && bookingForm.check_out_date
    ? Math.max(0, Math.ceil((new Date(bookingForm.check_out_date).getTime() - new Date(bookingForm.check_in_date).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const computedTotal = nights * Number(bookingForm.price_per_night || 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Properties</h1>
          <p className="text-sm text-muted-foreground">Manage staycation property listings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openBooking()}><CalendarDays className="mr-2 h-4 w-4" /> Add Booking</Button>
          <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Property</Button>
        </div>
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
                    <Button variant="ghost" size="icon" onClick={() => openBooking(p)} title="Add Booking"><CalendarDays className="h-4 w-4 text-primary" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Property Dialog */}
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

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Booking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Guest Name *</Label><Input placeholder="Full name of guest" value={bookingForm.guest_name} onChange={(e) => setBookingForm({ ...bookingForm, guest_name: e.target.value })} /></div>
            <div>
              <Label>Unit / Property *</Label>
              <Select value={bookingForm.property_id} onValueChange={(v) => {
                const prop = properties.find((p) => p.id === v);
                setBookingForm({ ...bookingForm, property_id: v, price_per_night: prop ? String(prop.price_per_night) : bookingForm.price_per_night });
              }}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>No. of Pax</Label><Input type="number" min="1" value={bookingForm.num_guests} onChange={(e) => setBookingForm({ ...bookingForm, num_guests: e.target.value })} /></div>
              <div><Label>Amount/Night (₱)</Label><Input type="number" value={bookingForm.price_per_night} onChange={(e) => setBookingForm({ ...bookingForm, price_per_night: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Check-in *</Label><Input type="date" value={bookingForm.check_in_date} onChange={(e) => setBookingForm({ ...bookingForm, check_in_date: e.target.value })} /></div>
              <div><Label>Check-out *</Label><Input type="date" value={bookingForm.check_out_date} onChange={(e) => setBookingForm({ ...bookingForm, check_out_date: e.target.value })} /></div>
            </div>
            {nights > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">{nights} night(s) × ₱{Number(bookingForm.price_per_night).toLocaleString()} = <span className="font-semibold text-foreground">₱{computedTotal.toLocaleString()}</span></p>
              </div>
            )}
            <Button onClick={handleSaveBooking} className="w-full">Create Booking</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertiesManagement;
