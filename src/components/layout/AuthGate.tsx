import { Navigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSession } from "@/lib/session";

export function AuthGate({
  children,
  requireAuth = true,
}: {
  children: ReactNode;
  requireAuth?: boolean;
}) {
  const { user, hydrated } = useSession();
  const location = useRouterState({ select: (state) => state.location as any });
  const pathname = location.pathname;

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (requireAuth && !user && pathname !== "/auth") {
    const nextPath = `${location.pathname}${location.searchStr ?? ""}${location.hash ?? ""}`;
    return <Navigate to="/auth" search={{ redirect: nextPath }} replace />;
  }

  return <>{children}</>;
}
