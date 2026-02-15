import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Home, Users, CalendarDays, DollarSign, Plus, Trash2, Check, X } from "lucide-react";

const AdminDashboard = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, properties: 0, bookings: 0, revenue: 0 });
  const [bookings, setBookings] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "properties" | "bookings" | "payments">("overview");
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newProperty, setNewProperty] = useState({ name: "", location: "", description: "", price_per_night: "", max_guests: "2", amenities: "" });

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [isAdmin, authLoading]);

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: userCount }, { count: propCount }, { data: bookingData }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("properties").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*, properties(name), profiles:user_id(full_name, email)").order("created_at", { ascending: false }),
      ]);
      const bks = bookingData || [];
      const revenue = bks.filter((b: any) => b.booking_status === "completed").reduce((s: number, b: any) => s + Number(b.total_price), 0);
      setStats({ users: userCount || 0, properties: propCount || 0, bookings: bks.length, revenue });
      setBookings(bks);

      const { data: props } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      setProperties(props || []);
    };
    if (isAdmin) fetchStats();
  }, [isAdmin]);

  const addProperty = async () => {
    const { error } = await supabase.from("properties").insert({
      name: newProperty.name,
      location: newProperty.location,
      description: newProperty.description,
      price_per_night: Number(newProperty.price_per_night),
      max_guests: Number(newProperty.max_guests),
      amenities: newProperty.amenities.split(",").map((a) => a.trim()).filter(Boolean),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Property added!" });
      setShowAddProperty(false);
      setNewProperty({ name: "", location: "", description: "", price_per_night: "", max_guests: "2", amenities: "" });
      const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      setProperties(data || []);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ booking_status: status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setBookings((prev) => prev.map((b) => b.id === id ? { ...b, booking_status: status } : b));
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  if (authLoading) return null;

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-accent" },
    { label: "Properties", value: stats.properties, icon: Home, color: "text-primary" },
    { label: "Bookings", value: stats.bookings, icon: CalendarDays, color: "text-accent" },
    { label: "Revenue", value: `₱${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
  ];

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b">
          {(["overview", "properties", "bookings", "payments"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-xl border bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <p className="mt-2 text-2xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <h2 className="font-heading text-xl font-semibold">Recent Bookings</h2>
              <div className="mt-4 space-y-3">
                {bookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                    <div>
                      <p className="font-medium">{b.properties?.name}</p>
                      <p className="text-sm text-muted-foreground">{(b.profiles as any)?.full_name || (b.profiles as any)?.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.booking_status === "confirmed" ? "bg-green-100 text-green-800" : b.booking_status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-muted text-muted-foreground"}`}>
                        {b.booking_status}
                      </span>
                      <p className="mt-1 text-sm font-semibold">₱{Number(b.total_price).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "properties" && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold">Manage Properties</h2>
              <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Property</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Property</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newProperty.name} onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })} /></div>
                    <div><Label>Location</Label><Input value={newProperty.location} onChange={(e) => setNewProperty({ ...newProperty, location: e.target.value })} /></div>
                    <div><Label>Description</Label><Textarea value={newProperty.description} onChange={(e) => setNewProperty({ ...newProperty, description: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Price/Night (₱)</Label><Input type="number" value={newProperty.price_per_night} onChange={(e) => setNewProperty({ ...newProperty, price_per_night: e.target.value })} /></div>
                      <div><Label>Max Guests</Label><Input type="number" value={newProperty.max_guests} onChange={(e) => setNewProperty({ ...newProperty, max_guests: e.target.value })} /></div>
                    </div>
                    <div><Label>Amenities (comma-separated)</Label><Input placeholder="WiFi, Pool, Aircon" value={newProperty.amenities} onChange={(e) => setNewProperty({ ...newProperty, amenities: e.target.value })} /></div>
                    <Button onClick={addProperty} className="w-full">Add Property</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="mt-4 space-y-3">
              {properties.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.location} · ₱{Number(p.price_per_night).toLocaleString()}/night · {p.max_guests} guests</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => deleteProperty(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="mt-6 space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{b.properties?.name}</p>
                    <p className="text-sm text-muted-foreground">{(b.profiles as any)?.full_name} · {format(new Date(b.check_in_date), "MMM d")} - {format(new Date(b.check_out_date), "MMM d, yyyy")}</p>
                    <p className="text-sm font-semibold">₱{Number(b.total_price).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.booking_status === "confirmed" ? "bg-green-100 text-green-800" : b.booking_status === "pending" ? "bg-yellow-100 text-yellow-800" : b.booking_status === "cancelled" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                      {b.booking_status}
                    </span>
                    {b.booking_status === "pending" && (
                      <>
                        <Button variant="outline" size="icon" onClick={() => updateBookingStatus(b.id, "confirmed")}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button variant="outline" size="icon" onClick={() => updateBookingStatus(b.id, "cancelled")}><X className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "payments" && (
          <div className="mt-6 text-center text-muted-foreground">
            <p>Payment management will appear here once bookings have associated payments.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDashboard;
