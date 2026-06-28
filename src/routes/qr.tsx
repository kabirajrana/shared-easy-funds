import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { api } from "@/services/api";
import { useSession } from "@/lib/session";
import { useGroupStore } from "@/store/useGroupStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/qr")({
  head: () => ({ meta: [{ title: "Payment QR — Sajha" }] }),
  component: () => <AuthGate><QrPage /></AuthGate>,
});

function QrPage() {
  const { group, role, setGroup } = useSession();
  const qc = useQueryClient();
  const upsertSharedGroup = useGroupStore((state) => state.upsertSharedGroup);
  const setActiveGroupId = useGroupStore((state) => state.setActiveGroupId);
  const { data } = useQuery({
    queryKey: ["qr", group?.id],
    queryFn: () => api.getQr(group!.id),
    enabled: !!group,
  });

  const [label, setLabel] = useState(data?.qr_label ?? group?.qr_label ?? "");
  const [editing, setEditing] = useState(false);

  const onUpload = async (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const remote = await api.uploadQr(group!.id, r.result as string, label || "Payment QR");
        const nextGroup = upsertSharedGroup({ ...remote });
        setActiveGroupId(group!.id);
        setGroup(nextGroup);
        qc.invalidateQueries({ queryKey: ["qr"] });
        setEditing(false);
        toast.success("QR updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update QR");
      }
    };
    r.readAsDataURL(f);
  };

  const img = data?.qr_image_url ?? group?.qr_image_url;
  const lbl = data?.qr_label ?? group?.qr_label;

  return (
    <AppShell title="Payment QR" back hideNav>
      <div className="flex flex-col items-center px-6 pt-6">
        {img ? (
          <div className="w-full rounded-3xl border border-border/60 bg-card p-6 text-center shadow-[var(--shadow-card)]">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pay to</p>
            <p className="mt-1 text-lg font-bold">{lbl}</p>
            <div className="mx-auto mt-4 grid aspect-square w-full max-w-xs place-items-center rounded-2xl bg-white p-4">
              <img src={img} alt="Payment QR" className="h-full w-full object-contain" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Scan with eSewa or your banking app</p>
          </div>
        ) : (
          <div className="w-full rounded-3xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
            No payment QR set up yet.
          </div>
        )}

        {role === "leader" && (
          <div className="mt-6 w-full space-y-3">
            {!editing ? (
              <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
                <Upload className="mr-2 h-4 w-4" /> {img ? "Replace QR" : "Upload QR"}
              </Button>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="eSewa – Ram Sharma" />
                </div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm font-medium">
                  <Upload className="h-4 w-4" /> Choose QR image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] ?? null)} />
                </label>
                <Button variant="ghost" className="w-full" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
