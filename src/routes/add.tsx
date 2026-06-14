import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api, EXPENSE_CATEGORIES } from "@/services/api";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";

type AddMode = "expense" | "contribution" | "request";

export const Route = createFileRoute("/add")({
  validateSearch: (s: Record<string, unknown>) => ({
    type: (s.type as AddMode | undefined) ?? "expense",
  }),
  component: () => <AuthGate><AddPage /></AuthGate>,
});

function AddPage() {
  const search = useSearch({ from: "/add" });
  const { group, role } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [mode, setMode] = useState<AddMode>(search.type);
  const [category, setCategory] = useState<string>("Groceries");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [receipt, setReceipt] = useState<string | null>(null);

  const isContribution = mode === "contribution";
  const isLeaderExpense = role === "leader" && mode === "expense";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    await api.createTransaction(group!.id, {
      type: isContribution ? "contribution" : "expense",
      category: isContribution ? "Contribution" : category,
      amount: amt,
      description,
      date: new Date(date).toISOString(),
      receipt_url: receipt ?? undefined,
      asLeader: isLeaderExpense,
    });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    toast.success(
      isContribution
        ? "Contribution logged"
        : isLeaderExpense
        ? "Expense saved"
        : "Request sent to leader for approval"
    );
    navigate({ to: "/" });
  };

  const onFile = (f: File | null) => {
    if (!f) return setReceipt(null);
    const r = new FileReader();
    r.onload = () => setReceipt(r.result as string);
    r.readAsDataURL(f);
  };

  const tabs: { id: AddMode; label: string }[] = [
    { id: "expense", label: role === "leader" ? "Expense" : "Log expense" },
    { id: "request", label: "Request spend" },
    { id: "contribution", label: "Contribute" },
  ];

  return (
    <AppShell title="New entry" back hideNav>
      <div className="px-4 pt-4">
        <div className="flex rounded-full bg-muted p-1 text-xs">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={
                "flex-1 rounded-full px-3 py-2 font-semibold transition " +
                (mode === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4 pb-12">
          {!isContribution && (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Amount (NPR)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 text-2xl font-bold"
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" />
          </div>

          <div className="space-y-1.5">
            <Label>{isContribution ? "Note (payment method, etc.)" : "Description"}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={isContribution ? "e.g. eSewa transfer" : "Bhatbhateni weekly run…"} />
          </div>

          {!isContribution && (
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <Camera className="h-5 w-5" />
              {receipt ? "Receipt attached — tap to change" : "Attach receipt photo (optional)"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
          {receipt && <img src={receipt} alt="Receipt" className="max-h-48 w-full rounded-xl object-contain border border-border" />}

          <Button type="submit" className="h-12 w-full text-base font-semibold">
            {isContribution ? "Log contribution" : isLeaderExpense ? "Save expense" : mode === "request" ? "Send request" : "Submit"}
          </Button>

          {!isLeaderExpense && !isContribution && (
            <p className="text-center text-xs text-muted-foreground">Your leader will review this request.</p>
          )}
        </form>
      </div>
    </AppShell>
  );
}
