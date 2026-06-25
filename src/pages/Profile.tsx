import { useEffect, useRef, useState } from "react";
import { IconChevronRight, IconLogout2, IconQrcode } from "@tabler/icons-react";
import { Moon, SunMedium, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SajhaAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session";
import { Switch } from "@/components/ui/switch";
import { useUserStore } from "@/store/useUserStore";
import { getInitialTheme, saveTheme, type ThemeMode } from "@/lib/theme";
import { getInitials } from "@/lib/utils";
import type { PaymentProvider } from "@/types";

export function ProfilePage() {
  const { logout, role, updateUser } = useSession();
  const user = useUserStore((state) => state.currentUser);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const updateBudget = useUserStore((state) => state.updateBudget);
  const setPaymentProvider = useUserStore((state) => state.setPaymentProvider);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [budget, setBudget] = useState(String(user.monthlyBudget));
  const [qrLabel, setQrLabel] = useState(user.paymentQR?.name ?? user.name);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(user.paymentQR?.provider ?? "eSewa");
  const [avatarPreview, setAvatarPreview] = useState(user.avatarImage ?? "");

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    setName(user.name);
    setBudget(String(user.monthlyBudget));
    setQrLabel(user.paymentQR?.name ?? user.name);
    setSelectedProvider(user.paymentQR?.provider ?? "eSewa");
    setAvatarPreview(user.avatarImage ?? "");
  }, [user]);

  const canEditBudget = role !== "member";
  const canEditQr = role !== "member";

  const saveProfile = () => {
    const nextName = name.trim() || user.name;
    const nextInitials = getInitials(nextName);
    updateProfile({
      name: nextName,
      initials: nextInitials,
      avatarImage: avatarPreview || undefined,
    });
    updateUser({
      name: nextName,
      initials: nextInitials,
      avatarImage: avatarPreview || undefined,
    });
  };

  const saveBudget = () => {
    if (!canEditBudget) return;
    updateBudget(Number(budget) || user.monthlyBudget);
  };

  const uploadAvatar = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextAvatar = reader.result as string;
      setAvatarPreview(nextAvatar);
      updateProfile({ avatarImage: nextAvatar });
      updateUser({ avatarImage: nextAvatar });
    };
    reader.readAsDataURL(file);
  };

  const saveQr = (file?: string) => {
    if (!canEditQr) return;
    const nextLabel = qrLabel.trim() || name.trim() || user.name;
    setPaymentProvider(selectedProvider, nextLabel, file ?? user.paymentQR?.qrImage);
    updateUser({
      paymentQR: { provider: selectedProvider, name: nextLabel, qrImage: file ?? user.paymentQR?.qrImage },
    });
  };

  const uploadQr = (file: File | null) => {
    if (!file || !canEditQr) return;
    const reader = new FileReader();
    reader.onload = () => {
      saveQr(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pb-20">
      <PageHeader title="Profile" back={false} />
      <div className="space-y-3 px-4">
        <section className="rounded-[12px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex gap-3">
            <div className="relative shrink-0">
              <SajhaAvatar name={name || user.name} src={avatarPreview || user.avatarImage} size="lg" />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -right-1 -bottom-1 grid h-8 w-8 place-items-center rounded-full border border-[var(--saj-border)] bg-[var(--saj-surface)] text-[var(--saj-green)] shadow-sm"
                aria-label="Upload photo"
              >
                <Upload className="h-4 w-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => uploadAvatar(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="truncate text-[16px] font-semibold text-[var(--saj-text)]">{name || user.name}</p>
                <p className="truncate text-[12px] text-[var(--saj-muted)]">{user.email}</p>
              </div>
              <Input
                label="Username"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
              <Button type="button" onClick={saveProfile} className="h-10 w-full">
                Save profile
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--saj-green-pale)] text-[var(--saj-green)]">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[var(--saj-text)]">Dark theme</p>
              <p className="text-[11px] text-[var(--saj-muted)]">Switch between light and dark mode.</p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              className="h-6 w-11 data-[state=checked]:bg-[var(--saj-green)] data-[state=unchecked]:bg-[#d9dfdc]"
            />
          </div>
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[var(--saj-green-pale)] text-[var(--saj-green)]">
              <IconQrcode className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[var(--saj-text)]">QR code</p>
              <p className="text-[11px] text-[var(--saj-muted)]">
                {user.paymentQR ? `${user.paymentQR.provider} · ${user.paymentQR.name}` : "Upload your payment QR"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={selectedProvider === "eSewa" ? "default" : "secondary"}
              onClick={() => setSelectedProvider("eSewa")}
            >
              eSewa
            </Button>
            <Button
              type="button"
              variant={selectedProvider === "Bank" ? "default" : "secondary"}
              onClick={() => setSelectedProvider("Bank")}
            >
              Bank
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--saj-border)] bg-[var(--saj-surface)] p-3">
            {user.paymentQR?.provider === selectedProvider && user.paymentQR?.qrImage ? (
              <img src={user.paymentQR.qrImage} alt={`${selectedProvider} QR code`} className="mx-auto max-h-56 w-full object-contain" />
            ) : (
              <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-[var(--saj-border)] text-center">
                <div>
                  <p className="text-[13px] font-medium text-[var(--saj-text)]">No QR uploaded yet</p>
                  <p className="mt-1 text-[11px] text-[var(--saj-muted)]">
                    Upload the {selectedProvider} QR so members can scan it.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <Input
              label="QR label"
              value={qrLabel}
              onChange={(event) => setQrLabel(event.target.value)}
              placeholder={`${selectedProvider} - ${name || user.name}`}
              disabled={!canEditQr}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => qrInputRef.current?.click()}
                disabled={!canEditQr}
              >
                <Upload className="mr-2 h-4 w-4" />
                {user.paymentQR?.provider === selectedProvider && user.paymentQR?.qrImage ? "Replace QR" : "Upload QR"}
              </Button>
              <Button type="button" onClick={() => saveQr()} disabled={!canEditQr}>
                Save QR
              </Button>
            </div>
            <input
              ref={qrInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => uploadQr(event.target.files?.[0] ?? null)}
            />
          </div>
        </section>

        <section className="rounded-[12px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[var(--saj-text)]">Monthly budget</p>
              <p className="text-[11px] text-[var(--saj-muted)]">
                {canEditBudget ? "You can update this as the team leader." : "Only the team leader can edit this."}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              disabled={!canEditBudget}
            />
            <Button onClick={saveBudget} disabled={!canEditBudget}>
              Save
            </Button>
          </div>
        </section>

        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-between rounded-[12px] border border-[var(--saj-border)] bg-[var(--saj-surface)] px-4 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          <span className="flex items-center gap-3 text-[14px] font-medium text-[var(--saj-red)]">
            <IconLogout2 className="h-4 w-4" />
            Sign out
          </span>
          <IconChevronRight className="h-4 w-4 text-[var(--saj-hint)]" />
        </button>
      </div>
    </div>
  );
}
