import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PaymentsManagement = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, bookings(id, properties(name), profiles:user_id(full_name, email))")
      .order("created_at", { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => { fetchPayments(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("payments").update({ payment_status: status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Payment marked as ${status}` }); fetchPayments(); }
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      unpaid: "bg-destructive/10 text-destructive",
      partially_paid: "bg-warning/10 text-warning",
      paid: "bg-success/10 text-success",
    };
    return m[s] || "bg-muted text-muted-foreground";
  };

  const filtered = payments.filter((p) => filter === "all" || p.payment_status === filter);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Payments</h1>
      <p className="text-sm text-muted-foreground">Track and confirm guest payments</p>

      <div className="mt-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Guest</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Proof</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No payments found</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{(p.bookings?.profiles as any)?.full_name || "—"}</p>
                </td>
                <td className="px-4 py-3">{p.bookings?.properties?.name}</td>
                <td className="px-4 py-3 font-medium">₱{Number(p.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(p.payment_status)}`}>
                    {p.payment_status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.proof_image_url ? (
                    <Button variant="ghost" size="icon" onClick={() => setProofUrl(p.proof_image_url)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : <span className="text-xs text-muted-foreground">None</span>}
                </td>
                <td className="px-4 py-3">
                  {p.payment_status !== "paid" && (
                    <Button variant="ghost" size="sm" onClick={() => updateStatus(p.id, "paid")}>
                      <CheckCircle className="mr-1 h-4 w-4 text-success" /> Confirm
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!proofUrl} onOpenChange={() => setProofUrl(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment Proof</DialogTitle></DialogHeader>
          {proofUrl && <img src={proofUrl} alt="Payment proof" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsManagement;
