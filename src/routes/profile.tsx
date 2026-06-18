import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOut, Moon, Users, Plus, KeyRound, Check, Crown } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Sajha" }] }),
  component: () => <AuthGate><Profile /></AuthGate>,
});

function Profile() {
  const { user, group, logout, setGroup } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dark, setDark] = useState(false);

  const { data: myGroups = [] } = useQuery({
    queryKey: ["myGroups", user?.id],
    queryFn: () => api.myGroups(),
    enabled: !!user,
  });

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDark = (v: boolean) => {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
  };

  const onLogout = () => {
    logout();
    navigate({ to: "/auth" });
  };

  const switchGroup = (gid: string) => {
    const g = myGroups.find((x) => x.id === gid);
    if (!g) return;
    setGroup(g);
    qc.invalidateQueries();
    toast.success(`Switched to ${g.name}`);
    navigate({ to: "/" });
  };

  return (
    <AppShell title="Profile" back hideNav>
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Dark theme</span>
            </div>
            <Switch checked={dark} onCheckedChange={toggleDark} />
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My groups</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {myGroups.length === 0 && (
              <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                You haven't joined any group yet.
              </p>
            )}
            {myGroups.map((g) => {
              const isCurrent = g.id === group?.id;
              const isLeader = g.leader_id === user?.id;
              return (
                <button
                  key={g.id}
                  onClick={() => switchGroup(g.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left shadow-[var(--shadow-card)]"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{g.name}</p>
                      {isLeader && <Crown className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{g.invite_code}</p>
                  </div>
                  {isCurrent && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/onboarding" })}>
              <Plus className="mr-1 h-4 w-4" /> New group
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/onboarding" })}>
              <KeyRound className="mr-1 h-4 w-4" /> Join code
            </Button>
          </div>
        </section>

        <Button variant="outline" className="mt-8 w-full border-destructive/30 text-destructive hover:bg-destructive/10" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </div>
    </AppShell>
  );
}
