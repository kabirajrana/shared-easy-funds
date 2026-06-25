import { useEffect, useMemo, useState, type ComponentType } from "react";
import { IconCalendar, IconPlus, IconX } from "@tabler/icons-react";
import { CATEGORY_CONFIG, type CategoryKey } from "@/lib/categories";
import { formatDate } from "@/lib/utils";
import type { GroupExpense } from "@/lib/types";

const CATEGORY_ORDER: CategoryKey[] = [
  "food",
  "transport",
  "rent",
  "shopping",
  "health",
  "other",
];

type AddGroupExpenseSheetProps = {
  groupId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserInitials: string;
  currentUserColor: string;
  existingExpense?: GroupExpense;
  onSave: (expense: GroupExpense) => void;
  onClose: () => void;
};

export function AddGroupExpenseSheet({
  groupId,
  currentUserId,
  currentUserName,
  currentUserInitials,
  currentUserColor,
  existingExpense,
  onSave,
  onClose,
}: AddGroupExpenseSheetProps) {
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryKey>("food");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const existingExpenseId = existingExpense?.id ?? null;

  useEffect(() => {
    if (!existingExpense) {
      setAmount("");
      setTitle("");
      setCategory("food");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      return;
    }

    setAmount(String(existingExpense.amount));
    setTitle(existingExpense.title);
    setCategory(existingExpense.category);
    setDate(existingExpense.date);
    setNotes(existingExpense.notes ?? "");
  }, [existingExpenseId]);

  const saveDisabled = Number(amount) <= 0 || title.trim() === "";

  const handleSave = () => {
    if (saveDisabled) return;

    const expense: GroupExpense = {
      id: existingExpense?.id ?? `ge-${Date.now()}`,
      groupId,
      title: title.trim(),
      amount: Number(amount),
      category,
      date,
      addedAt: existingExpense?.addedAt ?? new Date().toISOString(),
      addedBy: currentUserId,
      addedByName: currentUserName,
      addedByInitials: currentUserInitials,
      addedByColor: currentUserColor,
      notes: notes.trim() || undefined,
    };

    onSave(expense);
    onClose();
  };

  const dateLabel = useMemo(
    () =>
      new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [date],
  );

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
        aria-label="Close sheet overlay"
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[24px] bg-[var(--saj-surface)] px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-[0_-18px_40px_rgba(0,0,0,0.14)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--saj-border)]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-3 grid h-8 w-8 place-items-center rounded-full text-[var(--saj-muted)]"
            aria-label="Close sheet"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <span className="text-[13px] text-[var(--saj-muted)]">Amount</span>
            <div className="mt-2 flex items-end justify-center gap-2">
              <span className="pb-2 text-[16px] text-[var(--saj-muted)]">NPR</span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                className="w-full max-w-[220px] border-0 bg-transparent text-center text-[28px] font-medium text-[var(--saj-text)] outline-none placeholder:text-[var(--saj-hint)]"
              />
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[13px] text-[var(--saj-muted)]">Title / description</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What did you buy?"
              className="w-full rounded-[12px] border border-[var(--saj-border)] px-3 py-3 text-[14px] outline-none"
            />
          </label>

          <div>
            <p className="mb-2 text-[13px] text-[var(--saj-muted)]">Category</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {CATEGORY_ORDER.map((key) => {
                const config = CATEGORY_CONFIG[key];
                const active = category === key;
                const Icon = config.icon as ComponentType<{ className?: string }>;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key as CategoryKey)}
                    className={
                      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium transition " +
                      (active
                        ? "border-transparent bg-[var(--saj-green)] text-white"
                        : "border-[var(--saj-border)] bg-white text-[var(--saj-muted)]")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[13px] text-[var(--saj-muted)]">Date</span>
            <div className="relative flex items-center gap-2 rounded-[12px] border border-[var(--saj-border)] px-3 py-3">
              <IconCalendar className="h-4 w-4 text-[var(--saj-muted)]" />
              <div className="flex-1 text-[14px] text-[var(--saj-text)]">{dateLabel}</div>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[13px] text-[var(--saj-muted)]">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Any notes? (optional)"
              rows={2}
              className="w-full rounded-[12px] border border-[var(--saj-border)] px-3 py-3 text-[14px] outline-none"
            />
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveDisabled}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--saj-green)] text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconPlus className="h-4 w-4" />
            Save expense
          </button>
        </div>
      </div>
    </div>
  );
}
