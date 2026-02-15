import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

const BookingsPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, properties(name, location)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setBookings(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const cancelBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").update({ booking_status: "cancelled" }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, booking_status: "cancelled" } : b));
      toast({ title: "Booking cancelled" });
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-heading text-3xl font-bold">My Bookings</h1>
        {loading ? (
          <p className="mt-8 text-center text-muted-foreground">Loading...</p>
        ) : bookings.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">You haven't made any bookings yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-xl border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-semibold">{b.properties?.name}</h3>
                    <p className="text-sm text-muted-foreground">{b.properties?.location}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[b.booking_status]}`}>
                    {b.booking_status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>Check-in: {format(new Date(b.check_in_date), "MMM d, yyyy")}</span>
                  <span>Check-out: {format(new Date(b.check_out_date), "MMM d, yyyy")}</span>
                  <span className="font-semibold text-foreground">₱{Number(b.total_price).toLocaleString()}</span>
                </div>
                {b.booking_status === "pending" && (
                  <Button variant="outline" size="sm" className="mt-3 text-destructive" onClick={() => cancelBooking(b.id)}>
                    Cancel Booking
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default BookingsPage;
