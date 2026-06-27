import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { SajhaAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";
import { useGroupStore } from "@/store/useGroupStore";

const palette = ["#1A6B5A", "#534AB7", "#BA7517", "#E24B4A", "#185FA5", "#888780"];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function CreateGroupPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const createGroup = useGroupStore((state) => state.createGroup);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const initializedNameRef = useRef(false);
  const today = new Date();
  const [name, setName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#1A6B5A");
  const [avatarImage, setAvatarImage] = useState<string | undefined>(undefined);
  const [targetBudget, setTargetBudget] = useState("45000");
  const [targetDate, setTargetDate] = useState(toDateInputValue(today));
  const minDate = toDateInputValue(today);
  const maxDate = toDateInputValue(addDays(today, 30));

  useEffect(() => {
    if (initializedNameRef.current) return;
    initializedNameRef.current = true;
    if (user?.name) {
      setName(`${user.name}'s Group`);
    }
  }, [user?.name]);

  const submit = () => {
    const parsedBudget = Number(targetBudget);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      toast.error("Please enter a valid target budget.");
      return;
    }
    if (!targetDate) {
      toast.error("Please choose a target date.");
      return;
    }
    if (targetDate < minDate || targetDate > maxDate) {
      toast.error("Target date must be within today and the next 30 days.");
      return;
    }
    const group = createGroup({
      name: name.trim() || (user?.name ? `${user.name}'s Group` : "My Group"),
      avatarColor,
      avatarImage,
      targetBudget: parsedBudget,
      targetDate,
      memberEmails: [],
      leader: user ?? undefined,
    });
    navigate({ to: `/groups/${group.id}` });
  };

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="pb-20">
      <PageHeader title="Create group" />
      <div className="space-y-3 px-4">
        <section className="rounded-[20px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <SajhaAvatar name={name.trim() || user?.name || "Group"} src={avatarImage} size="lg" />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -right-1 -bottom-1 grid h-8 w-8 place-items-center rounded-full border border-[var(--saj-border)] bg-[var(--saj-surface)] text-[var(--saj-green)] shadow-sm"
                aria-label="Upload group avatar"
              >
                <Upload className="h-4 w-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleAvatarFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--saj-muted)]">Group avatar</p>
              <p className="text-[12px] text-[var(--saj-muted)]">Upload a custom image or keep the color avatar.</p>
            </div>
          </div>
          {avatarImage ? (
            <button
              type="button"
              className="mt-3 text-[12px] font-medium text-[var(--saj-green)]"
              onClick={() => setAvatarImage(undefined)}
            >
              Remove custom image
            </button>
          ) : null}
        </section>

        <Input
          label="Group name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={user?.name ? `${user.name}'s Group` : "My Group"}
        />

        <Input
          label="Target budget (NPR)"
          type="number"
          min={1}
          value={targetBudget}
          onChange={(event) => setTargetBudget(event.target.value)}
          placeholder="45000"
        />

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <Label className="text-[14px] font-medium text-[var(--saj-text)]">Target date</Label>
          <p className="mt-1 text-[12px] text-[var(--saj-muted)]">
            Pick a specific date from today up to the next 30 days when the group should hit its target.
          </p>
          <div className="mt-3 max-w-44">
            <Input
              type="date"
              value={targetDate}
              min={minDate}
              max={maxDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>
          <p className="mt-2 text-[12px] text-[var(--saj-muted)]">
            You can choose any date between {minDate} and {maxDate}.
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
