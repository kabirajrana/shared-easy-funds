import { Link } from "@tanstack/react-router";
import { IconPlus } from "@tabler/icons-react";
import { GroupCard } from "@/components/groups/GroupCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useGroupStore } from "@/store/useGroupStore";

export function GroupsPage() {
  const groups = useGroupStore((state) => state.groups);

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
        {groups.length > 0 ? (
          groups.map((group) => <GroupCard key={group.id} group={group} />)
        ) : (
          <div className="rounded-[20px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <p className="text-[15px] font-semibold text-[var(--saj-text)]">No groups yet</p>
            <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
              Create your first group to start tracking shared budgets and expenses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

