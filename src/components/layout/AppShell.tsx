import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Home, ListChecks, BarChart3, Users, Plus, ArrowLeft, Pencil, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { api } from "@/services/api";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const { user, group, role, setGroup } = useSession();
  const isHome = pathname === "/";
  const canEdit = !back && isHome && role === "leader" && !!group;

  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(group?.name ?? "");
  const [draftAvatar, setDraftAvatar] = useState<string | undefined>(group?.avatar_url);
  const fileRef = useRef<HTMLInputElement>(null);

  const openEdit = () => {
    if (!canEdit) return;
    setDraftName(group!.name);
    setDraftAvatar(group!.avatar_url);
    setEditOpen(true);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setDraftAvatar(reader.result as string);
    reader.readAsDataURL(f);
  };

  const save = () => {
    if (!group) return;
    setGroup({ ...group, name: draftName.trim() || group.name, avatar_url: draftAvatar });
    setEditOpen(false);
  };

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
          <button
            onClick={openEdit}
            disabled={!canEdit}
            className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary text-primary-foreground font-extrabold disabled:cursor-default"
            aria-label={canEdit ? "Edit group" : "Group"}
          >
            {group?.avatar_url ? (
              <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              "स"
            )}
          </button>
        )}
        <button
          onClick={openEdit}
          disabled={!canEdit}
          className="flex min-w-0 flex-1 items-center gap-1 text-left disabled:cursor-default"
        >
          <h1 className="truncate text-base font-semibold">{title ?? "Sajha"}</h1>
          {canEdit && <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </button>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit group</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground"
            >
              {draftAvatar ? (
                <img src={draftAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                "स"
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] font-semibold text-white">
                <Upload className="h-3 w-3" /> Change
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Group name</label>
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Flat 4B – Baluwatar" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
