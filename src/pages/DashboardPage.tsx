import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, Users, CalendarDays, DollarSign, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import BookingCalendar from "@/components/BookingCalendar";

const DashboardPage = () => {
  const [stats, setStats] = useState({ users: 0, properties: 0, bookings: 0, revenue: 0, pending: 0, confirmed: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [{ count: users }, { count: properties }, { data: bookings }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("properties").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*, properties(name), profiles:user_id(full_name, email)").order("created_at", { ascending: false }),
      ]);
      const bks = bookings || [];
      const revenue = bks.filter((b: any) => b.booking_status === "completed" || b.booking_status === "confirmed").reduce((s: number, b: any) => s + Number(b.total_price), 0);
      const pending = bks.filter((b: any) => b.booking_status === "pending").length;
      const confirmed = bks.filter((b: any) => b.booking_status === "confirmed").length;
      setStats({ users: users || 0, properties: properties || 0, bookings: bks.length, revenue, pending, confirmed });
      setRecentBookings(bks.slice(0, 8));
    };
    fetch();
  }, []);

  const cards = [
    { label: "Total Revenue", value: `₱${stats.revenue.toLocaleString()}`, icon: DollarSign, accent: "bg-primary/10 text-primary" },
    { label: "Total Bookings", value: stats.bookings, icon: CalendarDays, accent: "bg-accent/10 text-accent" },
    { label: "Properties", value: stats.properties, icon: Home, accent: "bg-info/10 text-info" },
    { label: "Users", value: stats.users, icon: Users, accent: "bg-warning/10 text-warning" },
    { label: "Pending", value: stats.pending, icon: Clock, accent: "bg-warning/10 text-warning" },
    { label: "Confirmed", value: stats.confirmed, icon: TrendingUp, accent: "bg-success/10 text-success" },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-warning/10 text-warning",
      confirmed: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive",
      completed: "bg-info/10 text-info",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Overview of VillaHermia Staycation operations</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4 shadow-card animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <div className={`rounded-lg p-2 ${c.accent}`}>
                <c.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings as notification-style cards */}
      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">Recent Bookings</h2>
        {recentBookings.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No bookings yet</p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentBookings.map((b) => (
              <div key={b.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card animate-fade-in">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${statusBadge(b.booking_status)}`}>
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {b.guest_name || (b.profiles as any)?.full_name || "Guest"}{" "}
                    <span className="text-muted-foreground font-normal">booked</span>{" "}
                    {b.properties?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(b.check_in_date), "MMM d")} – {format(new Date(b.check_out_date), "MMM d, yyyy")}
                    {b.num_guests > 0 && ` · ${b.num_guests} pax`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">₱{Number(b.total_price).toLocaleString()}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(b.booking_status)}`}>
                    {b.booking_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Calendar Section */}
      <BookingCalendar />
    </div>
  );
};

export default DashboardPage;
