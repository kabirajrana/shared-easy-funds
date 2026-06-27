import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { IconQrcode, IconUser } from "@tabler/icons-react";
import { toast } from "sonner";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { getInitials } from "@/lib/utils";
import type { User } from "@/lib/types";
import { useUserStore } from "@/store/useUserStore";
import { api } from "@/services/api";
import { InstallAppBanner } from "@/components/pwa/InstallAppBanner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Auth — Sajha" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, hydrated, setUser, setGroup } = useSession();
  const signInUser = useUserStore((state) => state.signIn);
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const redirectTo = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("redirect")
    : null;

  if (hydrated && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const fullName = name.trim();
    const emailAddress = email.trim().toLowerCase();
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    if (!emailAddress || !emailPattern.test(emailAddress)) {
      toast.error("Please enter a real email address.");
      return;
    }

    if (mode === "signup" && !fullName) {
      toast.error("Please enter your full name.");
      return;
    }

    const displayName =
      mode === "signup" && fullName
        ? fullName
        : emailAddress.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    try {
      const authUser =
        mode === "login"
          ? await api.login(emailAddress, password)
          : await api.register(displayName, emailAddress, password);
      const nextUser: User = {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        avatarColor: "#1A6B5A",
        monthlyBudget: 45000,
        phone: phone.trim() || "",
        initials: getInitials(authUser.name),
      };

      setUser(nextUser);
      signInUser(nextUser);
      setGroup(null);
      toast.success(mode === "login" ? "Welcome back" : "Account created");
      if (redirectTo) {
        navigate({ to: redirectTo });
        return;
      }
      navigate({ to: mode === "signup" ? "/onboarding" : "/" });
    } catch (error: any) {
      toast.error(error?.message ?? "Something went wrong");
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-bg)]">
      <section className="relative flex min-h-[44vh] flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-mid)] to-[var(--color-primary-light)] px-4 pb-10 pt-6 text-white sm:px-5">
        <div className="absolute -left-12 top-16 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-2xl font-black text-[var(--color-primary)] shadow-lg">
            स
          </div>
          <div>
            <h1 className="text-[1.75rem] font-extrabold leading-none">Sajha</h1>
            <p className="mt-1 text-sm text-white/80">Shared savings. Shared trust.</p>
          </div>
        </div>

        <div className="space-y-3 pb-1">
          <div className="inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
            Group savings, split expenses & fund cycles
          </div>
          <div>
            <p className="max-w-[18rem] text-[2rem] font-black leading-[1.05] sm:max-w-xs sm:text-4xl">
              Track every paisa, together.
            </p>
            <p className="mt-2 max-w-[20rem] text-sm leading-6 text-white/80 sm:max-w-sm">
              One place for friends, flatmates, and families to manage shared money with less confusion.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur">
              12K+ members
            </span>
            <span className="rounded-full border border-white/15 bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur">
              Trusted & secure
            </span>
          </div>
        </div>
      </section>

      <div className="relative z-10 -mt-5 h-5">
        <div className="absolute inset-x-0 top-0 h-5 rounded-t-[28px] bg-gradient-to-b from-white/0 via-white/45 to-white" />
      </div>

      <section className="relative z-10 flex-1 rounded-t-[32px] bg-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 shadow-[0_-16px_44px_rgba(15,110,86,0.07)] sm:px-5">
        <div className="mx-auto mb-3 h-[5px] w-12 rounded-full bg-black/10" />
        <InstallAppBanner className="mb-4" />
        <TabSwitcher
          value={mode}
          onChange={setMode}
          options={[
            { value: "login", label: "Log in" },
            { value: "signup", label: "Sign up" },
          ]}
        />

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Input
            label={mode === "signup" ? "Full name" : "Email address"}
            value={mode === "signup" ? name : email}
            onChange={(event) => (mode === "signup" ? setName(event.target.value) : setEmail(event.target.value))}
            placeholder={mode === "signup" ? "Aarav Sharma" : "aarav@example.com"}
            leftIcon={<IconUser className="h-4 w-4" />}
          />

          {mode === "signup" ? (
            <Input
              label="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="aarav@example.com"
            />
          ) : null}

          {mode === "signup" ? (
            <Input
              label="Phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+977-98XXXXXXXX"
            />
          ) : null}

          <div>
            <Input
              label="Password"
              type="password"
              passwordToggle
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                className="text-sm font-medium text-[var(--color-primary)]"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <Button type="submit" className="h-12 w-full text-base">
            {mode === "login" ? "Log in →" : "Create account →"}
          </Button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-black/10" />
            <span className="text-xs text-[var(--color-hint)]">or continue with</span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="space-y-3">
            <ContinueWithButton icon={<GoogleMark />} label="Continue with Google" />
            <ContinueWithButton icon={<IconQrcode className="h-4 w-4" />} label="Continue with OTP" />
          </div>

          <p className="pt-2 text-center text-sm text-[var(--color-hint)]">
            New here?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="font-semibold text-[var(--color-primary)]"
            >
              Create a free account
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5 shrink-0"
    >
      <path fill="#4285F4" d="M21.35 11.1h-9.18v2.96h5.27c-.23 1.26-.95 2.33-2.03 3.05v2.54h3.29c1.93-1.78 3.04-4.4 3.04-7.49 0-.71-.06-1.39-.19-2.06Z" />
      <path fill="#34A853" d="M12.17 22c2.7 0 4.96-.89 6.61-2.35l-3.29-2.54c-.91.61-2.06.98-3.32.98-2.56 0-4.73-1.73-5.5-4.06H3.29v2.61A9.99 9.99 0 0 0 12.17 22Z" />
      <path fill="#FBBC05" d="M6.67 14.03a5.99 5.99 0 0 1 0-4.06V7.36H3.29a10 10 0 0 0 0 8.67l3.38-2Z" />
      <path fill="#EA4335" d="M12.17 5.98c1.47 0 2.8.51 3.85 1.5l2.88-2.88A9.7 9.7 0 0 0 12.17 2 9.99 9.99 0 0 0 3.29 7.36l3.38 2.61c.77-2.33 2.94-3.99 5.5-3.99Z" />
    </svg>
  );
}

function ContinueWithButton({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full rounded-2xl bg-white px-4"
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span className="h-5 w-5 shrink-0" aria-hidden="true" />
    </Button>
  );
}
