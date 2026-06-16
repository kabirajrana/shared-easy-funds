import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Home, ListChecks, BarChart3, Users, Plus, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "@/services/api";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  title,
  back,
  rightSlot,
  hideNav,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  rightSlot?: ReactNode;
  hideNav?: boolean;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();

  const { data: notifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.getNotifications,
    enabled: !!user,
  });
  const unread = notifs?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/85 px-4 backdrop-blur">
        {back ? (
          <button
            onClick={() => navigate({ to: ".." as any })}
            className="-ml-2 grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-extrabold">
            स
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{title ?? "Sajha"}</h1>
        </div>
        {rightSlot}
        <Link
          to="/notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Link>
      </header>

      <main className={cn("flex-1", !hideNav && "pb-24")}>{children}</main>

      {!hideNav && <BottomNav pathname={pathname} unread={unread} />}
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string; unread: number }) {
  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/transactions", label: "Transactions", icon: ListChecks },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/group", label: "Group", icon: Users },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
      <div className="grid grid-cols-5 items-end border-t border-border/60 bg-background/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur">
        {items.slice(0, 2).map((it) => (
          <NavItem key={it.to} {...it} active={isActive(pathname, it.to)} />
        ))}
        <div className="flex justify-center">
          <Link
            to="/add"
            className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-pop)] ring-4 ring-background"
            aria-label="Add"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
        {items.slice(2).map((it) => (
          <NavItem key={it.to} {...it} active={isActive(pathname, it.to)} />
        ))}
      </div>
    </nav>
  );
}

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: any; active: boolean }) {
  return (
    <Link
      to={to as any}
      className={cn(
        "flex flex-col items-center gap-0.5 px-1 py-1 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
