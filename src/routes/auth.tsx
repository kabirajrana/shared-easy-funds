import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Sajha" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, setUser, setGroup } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = mode === "login" ? await api.login(email, password) : await api.register(name, email, password);
      setUser(u);
      const mine = await api.myGroups();
      if (mine.length > 0) {
        setGroup(mine[0]);
        toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
        navigate({ to: "/" });
      } else {
        setGroup(null);
        toast.success(`Welcome, ${u.name.split(" ")[0]}!`);
        navigate({ to: "/onboarding" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background px-6 pt-16">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground text-2xl font-extrabold shadow-[var(--shadow-pop)]">
          स
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sajha</h1>
          <p className="text-sm text-muted-foreground">Shared fund. Shared trust.</p>
        </div>
      </div>

      <div className="mb-6 flex rounded-full bg-muted p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition " +
              (mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
            }
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={loading}>
          {loading ? "…" : mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Demo accounts: ram@sajha.app (leader), sita@sajha.app, hari@sajha.app
      </p>
    </div>
  );
}
