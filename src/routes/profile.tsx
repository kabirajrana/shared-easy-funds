import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { ProfilePage } from "@/pages/Profile";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Sajha" }] }),
  component: () => (
    <AuthGate>
      <ProfilePage />
    </AuthGate>
  ),
});

