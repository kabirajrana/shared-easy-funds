import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/layout/AuthGate";
import { GroupChatPanel } from "@/components/groups/GroupChatPanel";
import { useGroupStore } from "@/store/useGroupStore";

export const Route = createFileRoute("/groups/$groupId/chat")({
  head: () => ({ meta: [{ title: "Group Chat — Sajha" }] }),
  component: () => {
    const { groupId } = Route.useParams();
    return (
      <AuthGate>
        <GroupChatPage groupId={groupId} />
      </AuthGate>
    );
  },
});

function GroupChatPage({ groupId }: { groupId: string }) {
  const group = useGroupStore((state) => state.groups.find((entry) => entry.id === groupId));

  return (
    <div className="min-h-dvh bg-[#0b1117]">
      {group ? (
        <GroupChatPanel groupId={group.id} groupName={group.name} />
      ) : (
        <div className="grid min-h-dvh place-items-center px-6 text-center text-white/80">
          <div className="rounded-[20px] border border-white/10 bg-white/5 px-5 py-4">
            <p className="text-[15px] font-semibold">Group not found</p>
            <p className="mt-1 text-[12px] text-white/55">The chat you opened is not available.</p>
          </div>
        </div>
      )}
    </div>
  );
}
