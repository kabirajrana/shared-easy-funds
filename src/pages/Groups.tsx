import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GroupCard } from "@/components/groups/GroupCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session";
import { api } from "@/services/api";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useGroupStore } from "@/store/useGroupStore";

export function GroupsPage() {
  const groups = useGroupStore((state) => state.groups);
  const joinGroup = useGroupStore((state) => state.joinGroup);
  const hydrateWorkspace = useGroupStore((state) => state.hydrateWorkspace);
  const upsertSharedGroup = useGroupStore((state) => state.upsertSharedGroup);
  const setActiveGroupId = useGroupStore((state) => state.setActiveGroupId);
  const deleteGroup = useGroupStore((state) => state.deleteGroup);
  const deleteGroupExpenses = useExpenseStore((state) => state.deleteGroupExpenses);
  const { user, setGroup } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const incomingInvite = params.get("invite");
    if (incomingInvite) {
      setInviteCode(incomingInvite.toUpperCase());
    }
  }, []);

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await api.deleteGroupArtifacts(groupId);
      deleteGroupExpenses(groupId);
      deleteGroup(groupId);
      await hydrateWorkspace();
    },
    onSuccess: async () => {
      setGroup(null);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Group deleted");
      navigate({ to: "/groups" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete group");
    },
  });

  const handleJoin = async () => {
    try {
      const remote = await api.joinGroup(inviteCode);
      const group = upsertSharedGroup({
        ...remote,
      });
      setActiveGroupId(group.id);
      void joinGroup(remote.invite_code ?? (remote as any).inviteCode ?? inviteCode);
      await hydrateWorkspace();
      if (!group) {
        toast.error("Invite code not found.");
        return;
      }
      toast.success(`Joined ${group.name}`);
      setInviteCode("");
      navigate({ to: `/groups/${group.id}` });
    } catch (error: any) {
      toast.error(error?.message ?? "Invalid or expired invite code.");
    }
  };

  return (
    <div className="pb-6">
      <PageHeader
        title="Groups"
        back={false}
        rightSlot={
          <Button asChild size="icon" className="h-10 w-10 rounded-full">
            <Link to="/groups/new" aria-label="Create group">
              <IconPlus className="h-4 w-4" />
            </Link>
          </Button>
        }
      /> 

      <div className="space-y-3 px-4">
        <section className="rounded-[20px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--saj-muted)]">
            Join with invite code
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[var(--saj-muted)]">
            Ask the group leader for their invite code. Once you join, shared expenses, reports, and analytics will be available in the same workspace.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="SAJHA-XXXX"
              className="font-mono tracking-wider"
            />
            <Button type="button" onClick={handleJoin} disabled={!inviteCode.trim()}>
              Join
            </Button>
          </div>
        </section>

        {groups.length > 0 ? (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              canDelete={group.leaderId === user?.id}
              onDelete={() => deleteGroupMutation.mutate(group.id)}
            />
          ))
        ) : (
          <div className="rounded-[20px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="text-[15px] font-semibold text-[var(--saj-text)]">No groups yet</p>
            <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
              Create a group if you are the leader, or join one with an invite code.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

