import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, Search } from "lucide-react";

const BookingsManagement = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchBookings = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*, properties(name, location), profiles:user_id(full_name, email)")
      .order("created_at", { ascending: false });
    setBookings(data || []);
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ booking_status: status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Booking ${status}` }); fetchBookings(); }
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      pending: "bg-warning/10 text-warning", confirmed: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive", completed: "bg-info/10 text-info",
    };
    return m[s] || "bg-muted text-muted-foreground";
  };

  const filtered = bookings.filter((b) => {
    if (filter !== "all" && b.booking_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const guest = (b.guest_name || (b.profiles as any)?.full_name || "").toLowerCase();
      const prop = (b.properties?.name || "").toLowerCase();
      if (!guest.includes(q) && !prop.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Bookings</h1>
      <p className="text-sm text-muted-foreground">View and manage all guest bookings</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by guest or property..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Guest</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pax</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Check-in</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Check-out</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No bookings found</td></tr>
            ) : filtered.map((b) => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{b.guest_name || (b.profiles as any)?.full_name || "—"}</p>
                  {(b.profiles as any)?.email && <p className="text-xs text-muted-foreground">{(b.profiles as any)?.email}</p>}
                </td>
                <td className="px-4 py-3">{b.properties?.name}</td>
                <td className="px-4 py-3">{b.num_guests || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(b.check_in_date), "MMM d, yyyy")}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(b.check_out_date), "MMM d, yyyy")}</td>
                <td className="px-4 py-3 font-medium">₱{Number(b.total_price).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(b.booking_status)}`}>{b.booking_status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {b.booking_status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => updateStatus(b.id, "confirmed")} title="Confirm">
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => updateStatus(b.id, "cancelled")} title="Cancel">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    {b.booking_status === "confirmed" && (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(b.id, "completed")}>
                        Complete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingsManagement;
