import { createFileRoute } from "@tanstack/react-router";
import { GroupDetailPage } from "@/pages/GroupDetail";

export const Route = createFileRoute("/groups/$groupId/")({
  head: () => ({ meta: [{ title: "Group — Sajha" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    expenseId: typeof search.expenseId === "string" ? search.expenseId : undefined,
  }),
  component: () => {
    const { groupId } = Route.useParams();
    const { expenseId } = Route.useSearch();
    return <GroupDetailPage groupId={groupId} highlightExpenseId={expenseId} />;
  },
});
