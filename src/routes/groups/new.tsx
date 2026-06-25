import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { CreateGroupPage } from "@/pages/CreateGroup";

export const Route = createFileRoute("/groups/new")({
  head: () => ({ meta: [{ title: "Create group — Sajha" }] }),
  component: () => (
    <AuthGate>
      <CreateGroupPage />
    </AuthGate>
  ),
});

