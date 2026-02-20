import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Home, CalendarDays, DollarSign, TrendingUp, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, getMonth, getYear } from "date-fns";
import BookingCalendar from "@/components/BookingCalendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DashboardPage = () => {
  const [stats, setStats] = useState({ properties: 0, bookings: 0, revenue: 0, pending: 0, confirmed: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [incomeView, setIncomeView] = useState<"all" | string>("all");

  useEffect(() => {
    const fetchData = async () => {
      const [propertiesSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, "properties")),
        getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc"))),
      ]);

      const propertiesMap: Record<string, any> = {};
      propertiesSnap.forEach((d) => { propertiesMap[d.id] = { id: d.id, ...d.data() }; });
      const props = propertiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      const bks: any[] = bookingsSnap.docs.map((d) => {
        const data = d.data() as any;
        return { id: d.id, ...data, properties: propertiesMap[data.property_id] || null };
      });

      // Lifetime gross = only completed bookings
      const revenue = bks
        .filter((b: any) => b.booking_status === "completed")
        .reduce((s: number, b: any) => s + Number(b.total_price), 0);
      const pending = bks.filter((b: any) => b.booking_status === "pending").length;
      const confirmed = bks.filter((b: any) => b.booking_status === "confirmed").length;

      setStats({ properties: propertiesSnap.size, bookings: bks.length, revenue, pending, confirmed });
      setRecentBookings(bks.slice(0, 8));
      setAllBookings(bks);
      setProperties(props);
    };
    fetchData();
  }, []);

  // Helper: normalize date from Firestore Timestamp or string
  const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (val?.toDate) return val.toDate();
    try { return parseISO(String(val).slice(0, 10)); } catch { return null; }
  };

  // Monthly income calculation
  const monthlyIncome = useMemo(() => {
    const base = allBookings.filter((b) => {
      if (b.booking_status !== "completed") return false;
      const d = toDate(b.check_in_date);
      if (!d) return false;
      if (getMonth(d) !== selectedMonth || getYear(d) !== selectedYear) return false;
      if (incomeView !== "all" && b.property_id !== incomeView) return false;
      return true;
    });
    return base.reduce((s, b) => s + Number(b.total_price || 0), 0);
  }, [allBookings, selectedMonth, selectedYear, incomeView]);

  // Per-property monthly breakdown
  const propertyMonthlyBreakdown = useMemo(() => {
    return properties.map((p) => {
      const total = allBookings
        .filter((b) => {
          if (b.booking_status !== "completed") return false;
          if (b.property_id !== p.id) return false;
          const d = toDate(b.check_in_date);
          if (!d) return false;
          return getMonth(d) === selectedMonth && getYear(d) === selectedYear;
        })
        .reduce((s, b) => s + Number(b.total_price || 0), 0);
      return { ...p, monthlyTotal: total };
    });
  }, [allBookings, properties, selectedMonth, selectedYear]);

  // Available years from bookings
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allBookings.forEach((b) => {
      const d = toDate(b.check_in_date);
      if (d) years.add(getYear(d));
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allBookings]);

  const cards = [
    { label: "Gross Income (All Time)", value: `₱${stats.revenue.toLocaleString()}`, icon: DollarSign, accent: "bg-primary/10 text-primary" },
    { label: "Total Bookings", value: stats.bookings, icon: CalendarDays, accent: "bg-accent/10 text-accent" },
    { label: "Properties", value: stats.properties, icon: Home, accent: "bg-info/10 text-info" },
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

  const formatDate = (val: any) => {
    if (!val) return "";
    if (val?.toDate) return format(val.toDate(), "MMM d");
    return format(new Date(val), "MMM d");
  };

  const formatDateFull = (val: any) => {
    if (!val) return "";
    if (val?.toDate) return format(val.toDate(), "MMM d, yyyy");
    return format(new Date(val), "MMM d, yyyy");
  };

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Overview of VillaHermia Staycation operations</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      {/* Monthly Gross Income */}
      <div className="mt-8 rounded-xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Monthly Gross Income
            </h2>
            <p className="text-xs text-muted-foreground">From completed bookings only</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Property filter */}
            <Select value={incomeView} onValueChange={setIncomeView}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Month navigator */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-28 text-center">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {/* Year select */}
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <p className="text-3xl font-bold text-primary">₱{monthlyIncome.toLocaleString()}</p>
          <p className="mb-1 text-sm text-muted-foreground">
            {incomeView === "all" ? "all properties" : properties.find((p) => p.id === incomeView)?.name}
            {" · "}{MONTHS[selectedMonth]} {selectedYear}
          </p>
        </div>

        {/* Per-property breakdown for the selected month */}
        {incomeView === "all" && propertyMonthlyBreakdown.some((p) => p.monthlyTotal > 0) && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {propertyMonthlyBreakdown
              .filter((p) => p.monthlyTotal > 0)
              .map((p) => (
                <div key={p.id} className="rounded-lg border bg-background px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <span className="text-sm font-bold text-success ml-2">₱{p.monthlyTotal.toLocaleString()}</span>
                </div>
              ))}
          </div>
        )}
        {incomeView === "all" && !propertyMonthlyBreakdown.some((p) => p.monthlyTotal > 0) && (
          <p className="mt-3 text-sm text-muted-foreground">No completed bookings in {MONTHS[selectedMonth]} {selectedYear}.</p>
        )}
      </div>

      {/* Recent Bookings */}
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
                    {b.guest_name || "Guest"}{" "}
                    <span className="text-muted-foreground font-normal">booked</span>{" "}
                    {b.properties?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.check_in_date)} – {formatDateFull(b.check_out_date)}
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
