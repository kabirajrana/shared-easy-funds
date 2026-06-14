import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useSession } from "@/lib/session";

/** Redirects to /auth if no user, or /onboarding if user has no group. */
export function AuthGate({ children, requireGroup = true }: { children: ReactNode; requireGroup?: boolean }) {
  const { user, group } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!user) {
      if (pathname !== "/auth") navigate({ to: "/auth" });
      return;
    }
    if (requireGroup && !group && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [user, group, pathname, navigate, requireGroup]);

  if (!user || (requireGroup && !group)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  return <>{children}</>;
}
