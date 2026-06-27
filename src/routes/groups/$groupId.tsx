import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";

export const Route = createFileRoute("/groups/$groupId")({
  head: () => ({ meta: [{ title: "Group — Sajha" }] }),
  component: () => (
    <AuthGate>
      <Outlet />
    </AuthGate>
  ),
});

