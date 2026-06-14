import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/services/api";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user, setGroup } = useSession();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [target, setTarget] = useState(40000);
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  if (!user) {
    navigate({ to: "/auth" });
    return null;
  }

  const onCreate = async () => {
    const g = await api.createGroup(name || "New group", target);
    setGroup(g);
    toast.success("Group created");
    navigate({ to: "/" });
  };
  const onJoin = async () => {
    const g = await api.joinGroup(code || "SAJHA-4B23");
    setGroup(g);
    toast.success("Joined group");
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-12">
      <h1 className="text-2xl font-bold">Get started</h1>
      <p className="mt-1 text-sm text-muted-foreground">Create a new shared fund or join one with an invite code.</p>

      <div className="mt-6 flex rounded-full bg-muted p-1">
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTab(m)}
            className={
              "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition " +
              (tab === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
            }
          >
            {m === "create" ? "Create group" : "Join group"}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Group name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Flat 4B – Baluwatar" />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly target (NPR)</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(+e.target.value)} />
          </div>
          <Button className="h-12 w-full" onClick={onCreate}>Create group</Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Invite code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SAJHA-XXXX" />
          </div>
          <Button className="h-12 w-full" onClick={onJoin}>Join group</Button>
        </div>
      )}
    </div>
  );
}
