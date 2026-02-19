import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  property_id: string | null;
  date: string;
  createdAt: any;
}

const CATEGORIES = ["Maintenance", "Utilities", "Supplies", "Salary", "Marketing", "Taxes", "Other"];

const AnalyticsManagement = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "Maintenance", property_id: "all", date: format(new Date(), "yyyy-MM-dd") });

  const fetchAll = async () => {
    const [bookingsSnap, propertiesSnap, expensesSnap] = await Promise.all([
      getDocs(collection(db, "bookings")),
      getDocs(collection(db, "properties")),
      getDocs(query(collection(db, "expenses"), orderBy("createdAt", "desc"))),
    ]);
    const props = propertiesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const propertiesMap: Record<string, any> = {};
    props.forEach((p) => { propertiesMap[p.id] = p; });
    setProperties(props);
    setBookings(bookingsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      property: propertiesMap[(d.data() as any).property_id] || null,
    })));
    setExpenses(expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      return toast({ title: "Please fill all fields", variant: "destructive" });
    }
    try {
      await addDoc(collection(db, "expenses"), {
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        property_id: expenseForm.property_id === "all" ? null : expenseForm.property_id,
        date: expenseForm.date,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Expense recorded" });
      setExpenseOpen(false);
      setExpenseForm({ description: "", amount: "", category: "Maintenance", property_id: "all", date: format(new Date(), "yyyy-MM-dd") });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, "expenses", id));
      toast({ title: "Expense removed" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // ── Calculations ──────────────────────────────────────────
  const filteredBookings = selectedProperty === "all"
    ? bookings
    : bookings.filter((b) => b.property_id === selectedProperty);

  const filteredExpenses = selectedProperty === "all"
    ? expenses
    : expenses.filter((e) => e.property_id === selectedProperty || e.property_id === null);

  // Expected payout = all confirmed/pending bookings (not cancelled)
  const expectedPayout = filteredBookings
    .filter((b) => b.booking_status !== "cancelled")
    .reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);

  // Actual payout = only completed bookings (recorded as gross income)
  const actualPayout = filteredBookings
    .filter((b) => b.booking_status === "completed")
    .reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netIncome = actualPayout - totalExpenses;

  // Per-property breakdown
  const propertyBreakdown = properties.map((p) => {
    const propBookings = bookings.filter((b) => b.property_id === p.id);
    const propExpenses = expenses.filter((e) => e.property_id === p.id);
    const expected = propBookings.filter((b) => b.booking_status !== "cancelled").reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
    const actual = propBookings.filter((b) => b.booking_status === "completed").reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
    const exp = propExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { ...p, expected, actual, expenses: exp, net: actual - exp, bookingCount: propBookings.filter((b) => b.booking_status !== "cancelled").length };
  });

  const statCards = [
    { label: "Expected Payout", value: `₱${expectedPayout.toLocaleString()}`, icon: TrendingUp, accent: "bg-info/10 text-info", note: "Confirmed + pending bookings" },
    { label: "Actual Payout (Gross)", value: `₱${actualPayout.toLocaleString()}`, icon: DollarSign, accent: "bg-success/10 text-success", note: "Completed bookings only" },
    { label: "Total Expenses", value: `₱${totalExpenses.toLocaleString()}`, icon: TrendingDown, accent: "bg-destructive/10 text-destructive", note: "Recorded costs" },
    { label: "Net Income", value: `₱${netIncome.toLocaleString()}`, icon: BarChart3, accent: netIncome >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive", note: "Gross – Expenses" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Analytics & Finance</h1>
          <p className="text-sm text-muted-foreground">Track income, expenses, and payout per property</p>
        </div>
        <Button onClick={() => setExpenseOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
      </div>

      {/* Property Filter */}
      <div className="mt-6">
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <div className={`rounded-lg p-2 ${c.accent}`}>
                <c.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold">{c.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
          </div>
        ))}
      </div>

      {/* Per Property Breakdown */}
      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">Per Property Breakdown</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bookings</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expected</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actual (Gross)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expenses</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Net Income</th>
              </tr>
            </thead>
            <tbody>
              {propertyBreakdown.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.bookingCount}</td>
                  <td className="px-4 py-3 text-info">₱{p.expected.toLocaleString()}</td>
                  <td className="px-4 py-3 text-success">₱{p.actual.toLocaleString()}</td>
                  <td className="px-4 py-3 text-destructive">₱{p.expenses.toLocaleString()}</td>
                  <td className={`px-4 py-3 font-semibold ${p.net >= 0 ? "text-success" : "text-destructive"}`}>
                    ₱{p.net.toLocaleString()}
                  </td>
                </tr>
              ))}
              {propertyBreakdown.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No properties yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses Log */}
      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">Expense Log</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No expenses recorded</td></tr>
              ) : filteredExpenses.map((e) => {
                const prop = properties.find((p) => p.id === e.property_id);
                return (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{e.date ? format(new Date(e.date), "MMM d, yyyy") : "—"}</td>
                    <td className="px-4 py-3 font-medium">{e.description}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{e.category}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{prop?.name || "General"}</td>
                    <td className="px-4 py-3 font-medium text-destructive">₱{Number(e.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Description *</Label>
              <Input placeholder="e.g. Pool cleaning" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₱) *</Label>
                <Input type="number" min="0" placeholder="0" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Property (optional)</Label>
              <Select value={expenseForm.property_id} onValueChange={(v) => setExpenseForm({ ...expenseForm, property_id: v })}>
                <SelectTrigger><SelectValue placeholder="All / General" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">General (not property-specific)</SelectItem>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddExpense} className="w-full">Record Expense</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalyticsManagement;
