import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { Search, Pencil, Trash2, DollarSign } from "lucide-react";

const BookingsManagement = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState({ guest_name: "", num_guests: "", check_in_date: "", check_out_date: "", price_per_night: "" });
  const [dateConflict, setDateConflict] = useState<string | null>(null);

  // Actual payout dialog
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutBooking, setPayoutBooking] = useState<any>(null);
  const [actualPayoutAmount, setActualPayoutAmount] = useState("");

  const toDateVal = (val: any): Date | null => {
    if (!val) return null;
    if (val?.toDate) return val.toDate();
    try { return parseISO(String(val).slice(0, 10)); } catch { return null; }
  };

  const autoUpdateStatuses = async (bks: any[]) => {
    const today = startOfDay(new Date());
    const updates: Promise<void>[] = [];

    for (const b of bks) {
      const checkIn = toDateVal(b.check_in_date);
      const checkOut = toDateVal(b.check_out_date);
      if (!checkIn || !checkOut) continue;

      // Auto "currently_hosting": check-in has passed, checkout hasn't, and status is confirmed
      if (b.booking_status === "confirmed" && !isAfter(startOfDay(checkIn), today) && isAfter(startOfDay(checkOut), today)) {
        updates.push(updateDoc(doc(db, "bookings", b.id), { booking_status: "currently_hosting", updatedAt: serverTimestamp() }));
        b.booking_status = "currently_hosting";
      }
      // Auto "completed": checkout date has passed and status is currently_hosting
      else if (b.booking_status === "currently_hosting" && !isAfter(startOfDay(checkOut), today)) {
        updates.push(updateDoc(doc(db, "bookings", b.id), { booking_status: "completed", updatedAt: serverTimestamp() }));
        b.booking_status = "completed";
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  };

  const fetchAll = async () => {
    const [bookingsSnap, propertiesSnap] = await Promise.all([
      getDocs(collection(db, "bookings")),
      getDocs(collection(db, "properties")),
    ]);
    const propertiesMap: Record<string, any> = {};
    propertiesSnap.forEach((d) => { propertiesMap[d.id] = { id: d.id, ...d.data() }; });
    setProperties(propertiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const bks = bookingsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      properties: propertiesMap[(d.data() as any).property_id] || null,
    }));

    // Auto-update statuses based on dates
    await autoUpdateStatuses(bks);

    // Sort by check-in date descending (newest first)
    bks.sort((a: any, b: any) => {
      const dateA = toDateVal(a.check_in_date);
      const dateB = toDateVal(b.check_in_date);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });

    setBookings(bks);
  };

  useEffect(() => { fetchAll(); }, []);

  const checkDateConflict = async (propertyId: string, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<string | null> => {
    if (!propertyId || !checkIn || !checkOut) return null;
    const snap = await getDocs(query(
      collection(db, "bookings"),
      where("property_id", "==", propertyId),
    ));
    const newIn = parseISO(checkIn);
    const newOut = parseISO(checkOut);
    for (const d of snap.docs) {
      if (excludeBookingId && d.id === excludeBookingId) continue;
      const data = d.data() as any;
      if (data.booking_status === "cancelled") continue;
      if (!data.check_in_date || !data.check_out_date) continue;
      const existIn = typeof data.check_in_date === "string" ? parseISO(data.check_in_date) : data.check_in_date.toDate();
      const existOut = typeof data.check_out_date === "string" ? parseISO(data.check_out_date) : data.check_out_date.toDate();
      if (newIn.getTime() < existOut.getTime() && newOut.getTime() > existIn.getTime() && newIn.getTime() !== existOut.getTime() && newOut.getTime() !== existIn.getTime()) {
        return `Dates conflict with "${data.guest_name || "another guest"}" (${format(existIn, "MMM d")} – ${format(existOut, "MMM d, yyyy")}) on this property`;
      }
    }
    return null;
  };

  const openEdit = (b: any) => {
    setEditing(b);
    const toDateStr = (val: any) => {
      if (!val) return "";
      if (val?.toDate) return format(val.toDate(), "yyyy-MM-dd");
      return String(val).slice(0, 10);
    };
    const nights = b.check_in_date && b.check_out_date
      ? Math.max(1, Math.ceil((new Date(toDateStr(b.check_out_date)).getTime() - new Date(toDateStr(b.check_in_date)).getTime()) / 86400000))
      : 1;
    const pricePerNight = nights > 0 ? Math.round(b.total_price / nights) : b.total_price;
    setEditForm({
      guest_name: b.guest_name || "",
      num_guests: String(b.num_guests || 1),
      check_in_date: toDateStr(b.check_in_date),
      check_out_date: toDateStr(b.check_out_date),
      price_per_night: String(pricePerNight || 0),
    });
    setDateConflict(null);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editing) return;
    if (!editForm.check_in_date || !editForm.check_out_date || !editForm.guest_name) {
      return toast({ title: "Missing fields", variant: "destructive" });
    }
    const checkIn = new Date(editForm.check_in_date);
    const checkOut = new Date(editForm.check_out_date);
    if (checkOut <= checkIn) {
      return toast({ title: "Check-out must be after check-in", variant: "destructive" });
    }
    const conflict = await checkDateConflict(editing.property_id, editForm.check_in_date, editForm.check_out_date, editing.id);
    if (conflict) {
      setDateConflict(conflict);
      return;
    }
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
    const totalPrice = nights * Number(editForm.price_per_night);
    try {
      await updateDoc(doc(db, "bookings", editing.id), {
        guest_name: editForm.guest_name,
        num_guests: Number(editForm.num_guests),
        check_in_date: editForm.check_in_date,
        check_out_date: editForm.check_out_date,
        total_price: totalPrice,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Booking updated" });
      setEditOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openPayoutDialog = (booking: any) => {
    setPayoutBooking(booking);
    setActualPayoutAmount(String(booking.actual_payout ?? booking.total_price ?? 0));
    setPayoutOpen(true);
  };

  // When admin sets status to "completed", prompt for actual payout
  const handleStatusChange = (booking: any, newStatus: string) => {
    if (newStatus === "completed") {
      openPayoutDialog(booking);
    } else {
      updateStatus(booking.id, newStatus);
    }
  };

  const handlePayoutConfirm = async () => {
    if (!payoutBooking) return;
    const amount = Number(actualPayoutAmount);
    if (isNaN(amount) || amount < 0) {
      return toast({ title: "Please enter a valid amount", variant: "destructive" });
    }
    try {
      await updateDoc(doc(db, "bookings", payoutBooking.id), {
        booking_status: "completed",
        actual_payout: amount,
        completed_at: new Date().toISOString().slice(0, 10),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Booking completed with actual payout recorded" });
      setPayoutOpen(false);
      setPayoutBooking(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { booking_status: status, updatedAt: serverTimestamp() });
      toast({ title: `Booking ${status}` });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "bookings", id));
      toast({ title: "Booking deleted" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      pending: "bg-warning/10 text-warning",
      confirmed: "bg-success/10 text-success",
      currently_hosting: "bg-primary/10 text-primary",
      cancelled: "bg-destructive/10 text-destructive",
      completed: "bg-info/10 text-info",
    };
    return m[s] || "bg-muted text-muted-foreground";
  };

  const formatDate = (val: any) => {
    if (!val) return "—";
    if (val?.toDate) return format(val.toDate(), "MMM d, yyyy");
    return format(new Date(val), "MMM d, yyyy");
  };

  const filtered = bookings.filter((b) => {
    if (filter !== "all" && b.booking_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const guest = (b.guest_name || "").toLowerCase();
      const prop = (b.properties?.name || "").toLowerCase();
      if (!guest.includes(q) && !prop.includes(q)) return false;
    }
    return true;
  });

  const editNights = editForm.check_in_date && editForm.check_out_date
    ? Math.max(0, Math.ceil((new Date(editForm.check_out_date).getTime() - new Date(editForm.check_in_date).getTime()) / 86400000))
    : 0;
  const editTotal = editNights * Number(editForm.price_per_night || 0);

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
            <SelectItem value="currently_hosting">Currently Hosting</SelectItem>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expected</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actual Payout</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No bookings found</td></tr>
            ) : filtered.map((b) => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{b.guest_name || "—"}</p>
                </td>
                <td className="px-4 py-3">{b.properties?.name || "—"}</td>
                <td className="px-4 py-3">{b.num_guests || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(b.check_in_date)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(b.check_out_date)}</td>
                <td className="px-4 py-3 font-medium">₱{Number(b.total_price).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-success">
                  {b.actual_payout != null ? (
                    <button
                      className="underline decoration-dotted cursor-pointer hover:text-success/80"
                      onClick={() => openPayoutDialog(b)}
                      title="Click to edit actual payout"
                    >
                      ₱{Number(b.actual_payout).toLocaleString()}
                    </button>
                  ) : b.booking_status === "completed" ? (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openPayoutDialog(b)}>
                      <DollarSign className="h-3 w-3" /> Record
                    </Button>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(b.booking_status)}`}>{b.booking_status?.replace("_", " ")}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Select value={b.booking_status} onValueChange={(v) => handleStatusChange(b, v)}>
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="currently_hosting">Currently Hosting</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)} title="Edit booking">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Booking Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Booking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Guest Name</Label>
              <Input value={editForm.guest_name} onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })} />
            </div>
            <div>
              <Label>Property</Label>
              <Input value={editing?.properties?.name || "—"} disabled className="bg-muted/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>No. of Pax</Label>
                <Input type="number" min="1" value={editForm.num_guests} onChange={(e) => setEditForm({ ...editForm, num_guests: e.target.value })} />
              </div>
              <div>
                <Label>Rate / Night (₱)</Label>
                <Input type="number" value={editForm.price_per_night} onChange={(e) => { setEditForm({ ...editForm, price_per_night: e.target.value }); setDateConflict(null); }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check-in</Label>
                <Input type="date" value={editForm.check_in_date} onChange={(e) => { setEditForm({ ...editForm, check_in_date: e.target.value }); setDateConflict(null); }} />
              </div>
              <div>
                <Label>Check-out</Label>
                <Input type="date" value={editForm.check_out_date} onChange={(e) => { setEditForm({ ...editForm, check_out_date: e.target.value }); setDateConflict(null); }} />
              </div>
            </div>
            {editNights > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">
                  {editNights} night(s) × ₱{Number(editForm.price_per_night).toLocaleString()} ={" "}
                  <span className="font-semibold text-foreground">₱{editTotal.toLocaleString()}</span>
                </p>
              </div>
            )}
            {dateConflict && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{dateConflict}</div>
            )}
            <Button onClick={handleEditSave} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Actual Payout Dialog - shown when completing a booking */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Actual Payout</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please enter the actual amount received for <span className="font-semibold text-foreground">{payoutBooking?.guest_name}</span>'s booking.
              This will be recorded as gross income.
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="text-muted-foreground">Expected: <span className="font-semibold text-foreground">₱{Number(payoutBooking?.total_price || 0).toLocaleString()}</span></p>
            </div>
            <div>
              <Label>Actual Payout (₱)</Label>
              <Input
                type="number"
                min="0"
                value={actualPayoutAmount}
                onChange={(e) => setActualPayoutAmount(e.target.value)}
                placeholder="Enter actual amount received"
              />
            </div>
            <Button onClick={handlePayoutConfirm} className="w-full">Confirm & Complete Booking</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingsManagement;