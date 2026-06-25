import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { formatMonthlyCycle } from "@/lib/utils";
import { useGroupStore } from "@/store/useGroupStore";

const palette = ["#1A6B5A", "#534AB7", "#BA7517", "#E24B4A", "#185FA5", "#888780"];

export function CreateGroupPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const createGroup = useGroupStore((state) => state.createGroup);
  const [name, setName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#1A6B5A");
  const [targetDayOfMonth, setTargetDayOfMonth] = useState(5);

  useEffect(() => {
    if (!name.trim() && user?.name) {
      setName(`${user.name}'s Group`);
    }
  }, [name, user?.name]);

  const submit = () => {
    const group = createGroup({
      name: name.trim() || (user?.name ? `${user.name}'s Group` : "My Group"),
      avatarColor,
      targetDayOfMonth,
      memberEmails: [],
      leader: user ?? undefined,
    });
    navigate({ to: `/groups/${group.id}` });
  };

  return (
    <div className="pb-20">
      <PageHeader title="Create group" />
      <div className="space-y-3 px-4">
        <Input
          label="Group name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={user?.name ? `${user.name}'s Group` : "My Group"}
        />

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <Label className="text-[14px] font-medium text-[var(--saj-text)]">Target day of month</Label>
          <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
            Pick the day each month when the group should reach its target balance.
          </p>
          <div className="mt-3 max-w-32">
            <Input
              type="number"
              min={1}
              max={31}
              value={targetDayOfMonth}
              onChange={(event) => setTargetDayOfMonth(Math.max(1, Math.min(31, Number(event.target.value) || 1)))}
            />
          </div>
          <p className="mt-2 text-[12px] text-[var(--saj-muted)]">
            Current cycle: {formatMonthlyCycle(targetDayOfMonth)}
          </p>
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="text-[14px] font-medium text-[var(--saj-text)]">Avatar color</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={`h-10 w-10 rounded-full border-2 transition ${
                  avatarColor === color ? "border-[var(--saj-text)]" : "border-transparent"
                }`}
                style={{ background: color }}
                aria-label={`Choose ${color}`}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="text-[14px] font-medium text-[var(--saj-text)]">Invite members later</p>
          <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
            Share the secret invite code after the group is created. Registered members can also be invited from onboarding.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => navigate({ to: "/groups" })}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            Create group
          </Button>
        </div>
      </div>
    </div>
  );
}
