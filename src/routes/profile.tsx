import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOut, Moon, Users } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Sajha" }] }),
  component: () => <AuthGate><Profile /></AuthGate>,
});

function Profile() {
  const { user, group, logout, setUser } = useSession();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const initial = document.documentElement.classList.contains("dark");
    setDark(initial);
  }, []);

  const toggleDark = (v: boolean) => {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
  };

  const onLogout = () => {
    logout();
    navigate({ to: "/auth" });
  };

  // Demo: switch persona to see leader vs member views
  const switchPersona = async (email: string) => {
    const u = await api.login(email, "x");
    setUser(u);
    toast.success(`Switched to ${u.name}`);
  };

  return (
    <AppShell title="Profile" back hideNav>
      <div className="px-4 pt-6">
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
          <div className="border-t border-border/60 p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Current group</p>
                <p className="text-xs text-muted-foreground">{group?.name}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demo: switch persona</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { email: "ram@sajha.app", label: "Ram (Leader)" },
              { email: "sita@sajha.app", label: "Sita (Member)" },
              { email: "hari@sajha.app", label: "Hari (Member)" },
              { email: "mina@sajha.app", label: "Mina (Member)" },
            ].map((p) => (
              <Button key={p.email} variant="outline" size="sm" onClick={() => switchPersona(p.email)}>
                {p.label}
              </Button>
            ))}
          </div>
        </section>

        <Button variant="outline" className="mt-8 w-full border-destructive/30 text-destructive hover:bg-destructive/10" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </div>
    </AppShell>
  );
}
