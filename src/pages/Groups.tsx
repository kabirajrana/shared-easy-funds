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
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}

