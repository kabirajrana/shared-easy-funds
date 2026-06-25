import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { AnalyticsPage } from "@/pages/Analytics";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Sajha" }] }),
  component: () => (
    <AuthGate>
      <AnalyticsPage />
    </AuthGate>
  ),
});

