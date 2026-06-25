import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { AddExpensePage } from "@/pages/AddExpense";

export const Route = createFileRoute("/add")({
  head: () => ({ meta: [{ title: "Add expense — Sajha" }] }),
  component: () => (
    <AuthGate>
      <AddExpensePage />
    </AuthGate>
  ),
});

