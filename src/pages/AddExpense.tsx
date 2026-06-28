import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useGroupStore } from "@/store/useGroupStore";
import { useUserStore } from "@/store/useUserStore";
import type { ExpenseCategory } from "@/types";

const categories: ExpenseCategory[] = [
  "food",
  "transport",
  "rent",
  "utilities",
  "entertainment",
  "groceries",
  "health",
  "other",
];

export function AddExpensePage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.currentUser);
  const groups = useGroupStore((state) => state.groups);
  const groupMembers = useGroupStore((state) => state.groupMembers);
  const addExpense = useExpenseStore((state) => state.addExpense);
  const hydrateWorkspace = useExpenseStore((state) => state.hydrateWorkspace);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidById, setPaidById] = useState(user.id);
  const [splitType, setSplitType] = useState<"equal" | "amount" | "percentage">("equal");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");

  const members = useMemo(() => {
    if (!groupId) return [user];
    return groupMembers[groupId] ?? [user];
  }, [groupId, groupMembers, user]);

  useEffect(() => {
    void hydrateWorkspace();
  }, [hydrateWorkspace]);

  const submit = async () => {
    const parsedAmount = Number(amount);
    if (!description.trim() || !parsedAmount) return;

    const splitAmount = Math.round(parsedAmount / Math.max(members.length, 1));
    try {
      await addExpense({
        id: crypto.randomUUID(),
        description: description.trim(),
        title: description.trim(),
        amount: parsedAmount,
        category,
        date,
        paidById,
        groupId: groupId || undefined,
        splitType,
        splits: members.map((member) => ({ userId: member.id, amount: splitAmount })),
        createdAt: new Date().toISOString(),
        type: "expense",
      });
      navigate({ to: groupId ? `/groups/${groupId}` : "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save expense");
    }
  };

  return (
    <div className="pb-20">
      <PageHeader title="Add expense" />
      <div className="space-y-3 px-4">
        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--saj-muted)]">Amount</label>
          <div className="mt-2 flex items-end gap-2">
            <span className="pb-2 text-[18px] font-semibold text-[var(--saj-muted)]">NPR</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="w-full border-0 bg-transparent text-[38px] font-semibold tracking-tight text-[var(--saj-text)] outline-none placeholder:text-[var(--saj-hint)]"
            />
          </div>
        </section>

        <Input
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Lunch, rent, bus fare..."
        />

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="mb-3 text-[14px] font-medium text-[var(--saj-text)]">Category</p>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((item) => {
              const active = item === category;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`flex flex-col items-center gap-2 rounded-[12px] border px-2 py-3 text-[11px] capitalize ${
                    active
                      ? "border-[var(--saj-green)] bg-[var(--saj-green-pale)] text-[var(--saj-green)]"
                      : "border-[var(--saj-border)] bg-white text-[var(--saj-text)]"
                  }`}
                >
                  <CategoryIcon category={item} className="h-4 w-4" />
                  {item}
                </button>
              );
            })}
          </div>
        </section>

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-muted)]">Paid by</span>
          <select
            value={paidById}
            onChange={(event) => setPaidById(event.target.value)}
            className="h-11 w-full rounded-[8px] border border-[var(--saj-border)] bg-white px-3 text-[15px] outline-none"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--color-muted)]">Group</span>
          <select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            className="h-11 w-full rounded-[8px] border border-[var(--saj-border)] bg-white px-3 text-[15px] outline-none"
          >
            <option value="">Personal</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="mb-3 text-[14px] font-medium text-[var(--saj-text)]">Split type</p>
          <div className="grid grid-cols-3 gap-2">
            {(["equal", "amount", "percentage"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSplitType(value)}
                className={`rounded-[12px] border px-3 py-2 text-[12px] font-medium capitalize ${
                  splitType === value
                    ? "border-[var(--saj-green)] bg-[var(--saj-green-pale)] text-[var(--saj-green)]"
                    : "border-[var(--saj-border)] bg-white text-[var(--saj-text)]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => navigate({ to: "/" })}>
            Cancel
          </Button>
          <Button onClick={submit}>Save expense</Button>
        </div>
      </div>
    </div>
  );
}

