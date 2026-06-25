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
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (requireAuth && !user && pathname !== "/auth") {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
