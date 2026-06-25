import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteCodeCard({
  inviteCode,
  onAddMember,
}: {
  inviteCode: string;
  onAddMember?: (email: string) => void;
}) {
  const [email, setEmail] = useState("");

  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteCode);
  };

  const shareInvite = async () => {
    const text = `Join my Sajha group with invite code: ${inviteCode}`;
    if (navigator.share) {
      await navigator.share({ text, title: "Sajha invite" });
      return;
    }
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <p className="text-[11px] text-[var(--saj-muted)]">Invite code - share with members to join</p>
      <p className="mt-1 text-[22px] font-semibold tracking-[0.08em] text-[var(--saj-text)]">
        {inviteCode}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={copyInvite}>
          Copy
        </Button>
        <Button variant="primary" onClick={shareInvite}>
          Share
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="friend@example.com"
        />
        <Button
          type="button"
          onClick={() => {
            onAddMember?.(email.trim());
            setEmail("");
          }}
          disabled={!email.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

