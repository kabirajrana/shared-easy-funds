import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMonthlyCycle } from "@/lib/utils";
import { toast } from "sonner";
import { User as UserIcon, Users, KeyRound, X } from "lucide-react";
import { useGroupStore } from "@/store/useGroupStore";
import { useUserStore } from "@/store/useUserStore";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

type Mode = "solo" | "create" | "join";

function Onboarding() {
  const { user, setGroup } = useSession();
  const [mode, setMode] = useState<Mode>("join");
  const [name, setName] = useState("");
  const [target, setTarget] = useState(40000);
  const [targetDayOfMonth, setTargetDayOfMonth] = useState(5);
  const [code, setCode] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const joinGroup = useGroupStore((state) => state.joinGroup);
  const hydrateWorkspace = useGroupStore((state) => state.hydrateWorkspace);
  const upsertSharedGroup = useGroupStore((state) => state.upsertSharedGroup);
  const updateBudget = useUserStore((state) => state.updateBudget);

  if (!user) return <Navigate to="/auth" replace />;

  useEffect(() => {
    if (name.trim()) return;
    setName(mode === "solo" ? `${user.name} Fund` : `${user.name}'s Group`);
  }, [mode, name, user.name]);

  const addEmail = () => {
    const e = emailDraft.trim().toLowerCase();
    if (!e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      toast.error("Enter a valid email");
      return;
    }
    if (e === user.email.toLowerCase()) {
      toast.error("That's your own email");
      return;
    }
    if (emails.includes(e)) return;
    setEmails([...emails, e]);
    setEmailDraft("");
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "solo") {
        const remote = await api.createGroup(name.trim() || `${user.name} Fund`, target, {
          solo: true,
          targetDayOfMonth,
        });
        const g = upsertSharedGroup({
          ...remote,
          avatarColor: "#1A6B5A",
          targetDate: undefined,
          avatarImage: undefined,
        });
        updateBudget(target);
        setGroup(g);
        toast.success("Solo fund created");
        navigate({ to: "/" });
      } else if (mode === "create") {
        const remote = await api.createGroup(name.trim() || `${user.name}'s Group`, target, {
          targetDayOfMonth,
        });
        const g = upsertSharedGroup({
          ...remote,
          avatarColor: "#1A6B5A",
          targetDate: undefined,
          avatarImage: undefined,
        });
        updateBudget(target);
        setGroup(g);
        const registered = api.allUsers();
        const inviteResults = await Promise.allSettled(
          emails.map((email) => api.sendGroupInvite(remote.id, email.trim().toLowerCase())),
        );
        const missing = emails.filter((email) => !registered.some((u) => u.email.toLowerCase() === email));
        const sent = inviteResults.filter((result) => result.status === "fulfilled").length;
        if (sent > 0 && missing.length > 0) {
          toast.message("Group created", {
            description: `${sent} registered member(s) were sent join requests. ${missing.length} email(s) aren't registered yet, so share the invite code with them after they sign up.`,
          });
        } else if (sent > 0) {
          toast.success("Group created and join requests sent");
        } else if (missing.length > 0) {
          toast.message("Group created", {
            description: `${missing.length} email(s) aren't registered yet. Share the invite code so they can join later.`,
          });
        } else {
          toast.success("Group created");
        }
        navigate({ to: "/" });
      } else {
        const remote = await api.joinGroup(code);
        const g = upsertSharedGroup({
          ...remote,
          targetDate: undefined,
          avatarImage: undefined,
        });
        const local = joinGroup(remote.invite_code);
        hydrateWorkspace();
        if (!local) {
          toast.error("Invalid invite code. Ask the leader to share it again.");
          return;
        }
        setGroup(g);
        toast.success(`Joined ${g.name}`);
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Mode; label: string; icon: any }[] = [
    { id: "solo", label: "Solo", icon: UserIcon },
    { id: "create", label: "Create", icon: Users },
    { id: "join", label: "Join", icon: KeyRound },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-12" style={{ paddingTop: "calc(3rem + env(safe-area-inset-top))" }}>
      <h1 className="text-2xl font-bold">Get started</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track a fund on your own, create one for your group, or join with an invite code.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={
              "flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-sm font-semibold transition " +
              (mode === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {mode === "solo" && (
        <div className="mt-6 space-y-4">
          <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            Just for you — track your own monthly fund, expenses and contributions. No group, no approvals.
          </p>
          <div className="space-y-1.5">
            <Label>Fund name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My monthly fund" />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly target (NPR)</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(+e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Target day of month</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={targetDayOfMonth}
              onChange={(e) => setTargetDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Current cycle: {formatMonthlyCycle(targetDayOfMonth)}
          </p>
          <Button className="h-12 w-full" onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create solo fund"}
          </Button>
        </div>
      )}

      {mode === "create" && (
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Group name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Flat 4B – Baluwatar" />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly target (NPR)</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(+e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Target day of month</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={targetDayOfMonth}
              onChange={(e) => setTargetDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Current cycle: {formatMonthlyCycle(targetDayOfMonth)}
          </p>
          <div className="space-y-1.5">
            <Label>Invite members by email (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                placeholder="friend@example.com"
                type="email"
              />
              <Button type="button" variant="outline" onClick={addEmail}>Add</Button>
            </div>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {emails.map((e) => (
                  <span key={e} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                    {e}
                    <button onClick={() => setEmails(emails.filter((x) => x !== e))} aria-label="Remove">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Members must be registered in Sajha. Anyone you can't add now can still join later with your invite code.
            </p>
          </div>
          <Button className="h-12 w-full" onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create group"}
          </Button>
        </div>
      )}

      {mode === "join" && (
        <div className="mt-6 space-y-4">
          <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
            Ask the group leader for the secret invite code. It looks like <span className="font-mono font-bold">SAJHA-XXXX</span>.
          </p>
          <div className="space-y-1.5">
            <Label>Invite code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SAJHA-XXXX"
              className="font-mono tracking-wider"
            />
          </div>
          <Button className="h-12 w-full" onClick={submit} disabled={busy || !code.trim()}>
            {busy ? "Joining…" : "Join group"}
          </Button>
        </div>
      )}
    </div>
  );
}
