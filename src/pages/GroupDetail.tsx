import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ExpenseItem } from "@/components/expenses/ExpenseItem";
import { InviteCodeCard } from "@/components/groups/InviteCodeCard";
import { DeleteGroupDialog } from "@/components/groups/DeleteGroupDialog";
import { PaymentQRCard } from "@/components/groups/PaymentQRCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";
import { calculateBalances } from "@/utils/balances";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatMonthlyCycle } from "@/lib/utils";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useGroupStore } from "@/store/useGroupStore";
import { api } from "@/services/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

function formatTargetDay(day?: number) {
  if (!day) return "No target day set";
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `Due every month on the ${day}${suffix}`;
}

export function GroupDetailPage({ groupId, highlightExpenseId }: { groupId: string; highlightExpenseId?: string }) {
  const [tab, setTab] = useState<"expenses" | "balances">("expenses");
  const [draftTargetBudget, setDraftTargetBudget] = useState("");
  const [isHydrating, setIsHydrating] = useState(true);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const expenseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navigate = useNavigate();
  const { user, setGroup } = useSession();
  const queryClient = useQueryClient();
  const group = useGroupStore((state) => state.groups.find((entry) => entry.id === groupId));
  const groupMembers = useGroupStore((state) => state.groupMembers);
  const hydrateGroupWorkspace = useGroupStore((state) => state.hydrateWorkspace);
  const updateGroup = useGroupStore((state) => state.updateGroup);
  const deleteGroup = useGroupStore((state) => state.deleteGroup);
  const expenses = useExpenseStore((state) => state.expenses);
  const hydrateWorkspace = useExpenseStore((state) => state.hydrateWorkspace);
  const deleteGroupExpenses = useExpenseStore((state) => state.deleteGroupExpenses);
  const members = group ? groupMembers[group.id] ?? [] : [];
  const canEditBudget = !!group && group.leaderId === user?.id;
  const groupExpenses = useMemo(
    () => expenses.filter((expense) => expense.groupId === groupId),
    [expenses, groupId],
  );
  const canDeleteGroup = canEditBudget;

  useEffect(() => {
    setDraftTargetBudget(String(group?.targetBudget ?? ""));
  }, [group?.targetBudget]);

  useEffect(() => {
    let cancelled = false;

    const syncWorkspace = async () => {
      await Promise.all([hydrateGroupWorkspace(), hydrateWorkspace()]);
      if (!cancelled) setIsHydrating(false);
    };

    void syncWorkspace();

    return () => {
      cancelled = true;
    };
  }, [hydrateGroupWorkspace, hydrateWorkspace]);

  useEffect(() => {
    if (!highlightExpenseId) return;
    const node = expenseRefs.current[highlightExpenseId];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightExpenseId, groupExpenses]);

  const saveTargetBudget = useMutation({
    mutationFn: async () => {
      if (!group || !canEditBudget) throw new Error("Only the team leader can edit the group budget.");
      const nextBudget = Number(draftTargetBudget);
      if (!Number.isFinite(nextBudget) || nextBudget <= 0) {
        throw new Error("Please enter a valid target budget.");
      }
      updateGroup(group.id, { targetBudget: nextBudget });
      setGroup({ ...group, targetBudget: nextBudget });
      return nextBudget;
    },
    onSuccess: () => {
      toast.success("Target budget updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update target budget");
    },
  });

  const inviteMember = useMutation({
    mutationFn: async (email: string) => {
      return api.sendGroupInvite(groupId, email);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (result.deliveryStatus === "sent") {
        toast.success("Invitation sent! They will be notified in-app and by email.");
        return;
      }
      toast.message("Invitation saved", {
        description:
          result.deliveryStatus === "skipped"
            ? "Email delivery is not configured here, so share the invite code or link manually."
            : result.reason
              ? `The invite was saved in-app, but the email could not be sent: ${result.reason}`
              : "The invite was saved in-app, but the email could not be sent. Share the invite code or link manually.",
      });
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? "Could not send invite");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      await api.deleteGroupArtifacts(groupId);
      deleteGroupExpenses(groupId);
      deleteGroup(groupId);
      await hydrateWorkspace();
    },
    onSuccess: async () => {
      setGroup(null);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Group deleted");
      navigate({ to: "/groups" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete group");
    },
  });

  const balanceEdges = useMemo(() => {
    if (!group) return [];
    return calculateBalances(groupExpenses, group.memberIds);
  }, [group, groupExpenses]);

  const canEditQr = !!group && group.leaderId === user?.id;

  const onAttachQr = () => {
    qrInputRef.current?.click();
  };

  const handleQrFile = (file: File | null) => {
    if (!group || !file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const nextQr = {
        provider: group.paymentQR?.provider ?? "eSewa",
        name: group.paymentQR?.name ?? `${group.name} Wallet`,
        qrImage: reader.result as string,
      };
      updateGroup(group.id, { paymentQR: nextQr });
      toast.success("QR code attached");
    };
    reader.readAsDataURL(file);
  };

  const onShareQr = async () => {
    if (!group) return;

    const label = group.paymentQR?.name ?? `${group.name} Wallet`;
    const provider = group.paymentQR?.provider ?? "eSewa";
    const text = `Send payment to ${label} (${provider}) for ${group.name}.`;

    try {
      if (group.paymentQR?.qrImage && navigator.share) {
        const response = await fetch(group.paymentQR.qrImage);
        const blob = await response.blob();
        const file = new File([blob], `${group.name}-payment-qr.png`, { type: blob.type || "image/png" });
        await navigator.share({ title: `${group.name} payment QR`, text, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: `${group.name} payment QR`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("QR details copied");
      }
    } catch {
      await navigator.clipboard.writeText(text);
      toast.success("QR details copied");
    }
  };

  if (isHydrating) {
    return (
      <div className="px-4 py-4">
        <PageHeader title="Group" />
        <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 text-sm text-[var(--saj-muted)]">
          Restoring your group workspace...
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="px-4 py-4">
        <PageHeader title="Group" />
        <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 text-sm text-[var(--saj-muted)]">
          Group not found.
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader
        title={group.name}
        rightSlot={
          <div className="flex items-center gap-2">
            <Badge variant={group.balance === 0 ? "settled" : "owed"}>
              {group.balance === 0 ? "Settled up" : "Owed"}
            </Badge>
          </div>
        }
      />

      <div className="space-y-3 px-4">
        <InviteCodeCard
          inviteCode={group.inviteCode}
          isInviting={inviteMember.isPending}
          onAddMember={async (email) => {
            if (!email) return;
            await inviteMember.mutateAsync(email);
          }}
        />
        <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="text-[11px] text-[var(--saj-muted)]">Target schedule</p>
          {group.targetDate ? (
            <>
              <p className="mt-1 text-[14px] font-medium text-[var(--saj-text)]">
                Due on {new Date(group.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
                This group uses a fixed target date instead of a monthly cycle.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[14px] font-medium text-[var(--saj-text)]">{formatTargetDay(group.targetDayOfMonth)}</p>
              <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
                Current cycle: {formatMonthlyCycle(group.targetDayOfMonth)}
              </p>
            </>
          )}
        </div>
        <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] text-[var(--saj-muted)]">Target budget</p>
              <p className="mt-1 text-[14px] font-medium text-[var(--saj-text)]">
                {typeof group.targetBudget === "number" ? formatCurrency(group.targetBudget) : "Not set"}
              </p>
            </div>
            {canEditBudget ? (
              <span className="rounded-full bg-[var(--saj-green-pale)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--saj-green)]">
                Leader only
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
            This shared amount is visible everywhere in the group workspace.
          </p>
          {canEditBudget ? (
            <div className="mt-3 flex gap-2">
              <Input
                type="number"
                min={1}
                value={draftTargetBudget}
                onChange={(event) => setDraftTargetBudget(event.target.value)}
              />
              <Button
                type="button"
                onClick={() => saveTargetBudget.mutate()}
                disabled={saveTargetBudget.isPending}
                className="shrink-0"
              >
                {saveTargetBudget.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : null}
        </div>
        <PaymentQRCard paymentQR={group.paymentQR} canEdit={canEditQr} onAttach={onAttachQr} onShare={onShareQr} />
        {canEditQr ? (
          <input
            ref={qrInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleQrFile(event.target.files?.[0] ?? null)}
          />
        ) : null}

        <Link
          to={`/groups/${group.id}/chat`}
          className="block rounded-[16px] border border-[rgba(26,107,90,0.18)] bg-[linear-gradient(135deg,rgba(26,107,90,0.12),rgba(255,255,255,1))] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--saj-green)]">Chat</p>
              <h3 className="mt-1 text-[15px] font-semibold text-[var(--saj-text)]">Open full group chat</h3>
              <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
                Talk with the group in a dedicated full-screen messenger view.
              </p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--saj-green)] text-white">
              <span className="text-[18px] font-bold">+</span>
            </div>
          </div>
        </Link>

        <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-medium text-[var(--saj-text)]">
              Members ({members.length})
            </h2>
            <Link to="/add" className="text-[12px] font-medium text-[var(--saj-green)]">
              + Add expense
            </Link>
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center rounded-full text-[12px] font-semibold text-white"
                  style={{ background: member.avatarColor }}
                >
                  {(member.initials ?? member.name)
                    .split(" ")
                    .map((part) => part[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--saj-text)]">{member.name}</p>
                  <p className="text-[11px] text-[var(--saj-muted)]">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex rounded-full border border-[var(--saj-border)] bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("expenses")}
            className={`flex-1 rounded-full px-3 py-2 text-[13px] font-medium ${
              tab === "expenses" ? "bg-[var(--saj-green)] text-white" : "text-[var(--saj-muted)]"
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setTab("balances")}
            className={`flex-1 rounded-full px-3 py-2 text-[13px] font-medium ${
              tab === "balances" ? "bg-[var(--saj-green)] text-white" : "text-[var(--saj-muted)]"
            }`}
          >
            Balances
          </button>
        </div>

        {tab === "expenses" ? (
          <div className="overflow-hidden rounded-[12px] border border-[var(--saj-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            {groupExpenses.map((expense, index) => (
              <div
                key={expense.id}
                ref={(node) => {
                  expenseRefs.current[expense.id] = node;
                }}
                className={`transition ${expense.id === highlightExpenseId ? "bg-[rgba(26,107,90,0.08)] ring-1 ring-inset ring-[rgba(26,107,90,0.28)]" : ""} ${
                  index === groupExpenses.length - 1 ? "" : "border-b border-[var(--saj-border-soft)]"
                }`}
              >
                <ExpenseItem expense={expense} paidBy={members.find((member) => member.id === expense.paidById)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <h3 className="text-[14px] font-medium text-[var(--saj-text)]">Simplified balances</h3>
            <div className="mt-3 space-y-3">
              {balanceEdges.length > 0 ? balanceEdges.map((edge, index) => {
                const from = members.find((member) => member.id === edge.from)?.name ?? edge.from;
                const to = members.find((member) => member.id === edge.to)?.name ?? edge.to;
                return (
                  <div key={`${edge.from}-${edge.to}-${index}`} className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--saj-text)]">
                      {from} owes {to}
                    </span>
                    <span className="font-medium text-[var(--saj-green)]">{formatCurrency(edge.amount)}</span>
                  </div>
                );
              }) : (
                <p className="text-[13px] text-[var(--saj-muted)]">All settled up.</p>
              )}
            </div>
          </div>
        )}

        {canDeleteGroup ? (
          <section className="rounded-[16px] border border-[rgba(239,68,68,0.18)] bg-[linear-gradient(180deg,rgba(255,247,247,1),rgba(255,255,255,1))] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--saj-red)]">
              Danger zone
            </p>
            <h3 className="mt-1 text-[15px] font-semibold text-[var(--saj-text)]">Delete this group</h3>
            <p className="mt-1 text-[12px] leading-5 text-[var(--saj-muted)]">
              This action removes the group, members, expenses, and notifications from your workspace.
              It is only available to the team leader and cannot be undone.
            </p>
            <div className="mt-3">
              <DeleteGroupDialog
                groupName={group.name}
                onDelete={() => deleteGroupMutation.mutate()}
                pending={deleteGroupMutation.isPending}
                triggerLabel="I understand, delete this group"
                triggerClassName="w-full rounded-full bg-[var(--saj-red)] text-white hover:bg-[var(--saj-red)]/90"
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
