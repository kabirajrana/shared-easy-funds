import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { HomePage } from "@/pages/Home";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home — Sajha" }] }),
  component: () => (
    <AuthGate>
      <HomePage />
    </AuthGate>
  ),
});

