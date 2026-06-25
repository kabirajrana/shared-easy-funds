import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { GroupDetailPage } from "@/pages/GroupDetail";

export const Route = createFileRoute("/groups/$groupId")({
  head: () => ({ meta: [{ title: "Group — Sajha" }] }),
  component: () => {
    const { groupId } = Route.useParams();
    return (
      <AuthGate>
        <GroupDetailPage groupId={groupId} />
      </AuthGate>
    );
  },
});

