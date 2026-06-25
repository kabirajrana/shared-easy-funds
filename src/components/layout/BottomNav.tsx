import { Link, useRouterState } from "@tanstack/react-router";
import { IconChartBar, IconHome, IconPlus, IconUser, IconUsers } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: IconHome },
  { to: "/analytics", label: "Analytics", icon: IconChartBar },
  { to: "/groups", label: "Groups", icon: IconUsers },
  { to: "/profile", label: "Profile", icon: IconUser },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname === "/auth") return null;

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-[0.5px] border-[var(--saj-border)] bg-[var(--saj-surface)]">
      <div className="flex items-center px-0 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
        {items.slice(0, 2).map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="flex flex-1 flex-col items-center gap-[3px] px-1 py-1">
              <Icon className={cn("h-5 w-5", active ? "text-[var(--saj-green)]" : "text-[var(--saj-hint)]")} />
              <span className={cn("text-[10px]", active ? "font-medium text-[var(--saj-green)]" : "font-normal text-[var(--saj-hint)]")}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="-mt-4 flex flex-1 justify-center">
          <Link
            to="/add"
            className="grid h-12 w-12 place-items-center rounded-full border-[3px] border-[var(--saj-bg)] bg-[var(--saj-green)] text-white shadow-[0_8px_20px_rgba(15,110,86,0.25)]"
            aria-label="Add expense"
          >
            <IconPlus className="h-5 w-5" />
          </Link>
        </div>

        {items.slice(2).map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="flex flex-1 flex-col items-center gap-[3px] px-1 py-1">
              <Icon className={cn("h-5 w-5", active ? "text-[var(--saj-green)]" : "text-[var(--saj-hint)]")} />
              <span className={cn("text-[10px]", active ? "font-medium text-[var(--saj-green)]" : "font-normal text-[var(--saj-hint)]")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
