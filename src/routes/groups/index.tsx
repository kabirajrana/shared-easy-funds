import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { GroupsPage } from "@/pages/Groups";

export const Route = createFileRoute("/groups/")({
  head: () => ({ meta: [{ title: "Groups — Sajha" }] }),
  component: () => (
    <AuthGate>
      <GroupsPage />
    </AuthGate>
  ),
});

