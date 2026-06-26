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
import { toast } from "sonner";

export function ProfilePage() {
  const { logout, role, updateUser } = useSession();
  const user = useUserStore((state) => state.currentUser);
  const signOutUser = useUserStore((state) => state.signOut);
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

  const canEditBudget = role === "leader";
  const canEditQr = role !== "member";

  const saveProfile = () => {
    const nextName = name.trim();
    if (!nextName) {
      toast.error("Please enter your full name.");
      return;
    }
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
    if (!qrLabel.trim() || qrLabel.trim() === user.name) {
      setQrLabel(nextName);
    }
    toast.success("Profile saved");
  };

  const saveBudget = () => {
    if (!canEditBudget) return;
    const nextBudget = Number(budget);
    if (!Number.isFinite(nextBudget) || nextBudget <= 0) {
      toast.error("Please enter a valid budget amount.");
      return;
    }
    updateBudget(nextBudget);
    updateUser({ monthlyBudget: nextBudget });
    toast.success("Monthly budget saved");
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
      <div className="space-y-4 px-4">
        <section className="overflow-hidden rounded-[24px] border border-[var(--saj-border)] bg-[var(--saj-surface)] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="bg-gradient-to-br from-[var(--saj-green)] via-[#1c7a66] to-[#0f3a31] px-4 pb-5 pt-5 text-white">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="rounded-full ring-4 ring-white/15">
                  <SajhaAvatar name={name || user.name} src={avatarPreview || user.avatarImage} size="lg" />
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -right-1 -bottom-1 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white text-[var(--saj-green)] shadow-lg"
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
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">Account profile</p>
                <h2 className="truncate text-[1.35rem] font-bold leading-tight">{name || user.name}</h2>
                <p className="truncate text-[13px] text-white/80">{user.email}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Registered name</p>
                <p className="mt-1 truncate text-[13px] font-semibold">{user.name}</p>
              </div>
              <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Email</p>
                <p className="mt-1 truncate text-[13px] font-semibold">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="rounded-2xl border border-[var(--saj-border)] bg-[var(--saj-green-pale)] p-3 text-[12px] leading-5 text-[var(--saj-muted)]">
              Use your real name here so it stays consistent across groups, expenses, and QR labels.
            </div>
            <Input
              label="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Aarav Sharma"
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-[var(--saj-border)] bg-[var(--saj-surface)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--saj-muted)]">Registered email</p>
                <p className="mt-1 truncate text-[13px] font-medium text-[var(--saj-text)]">{user.email}</p>
              </div>
              <div className="rounded-2xl border border-[var(--saj-border)] bg-[var(--saj-surface)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--saj-muted)]">Phone</p>
                <p className="mt-1 truncate text-[13px] font-medium text-[var(--saj-text)]">
                  {user.phone ?? "Not added"}
                </p>
              </div>
            </div>
            <Button type="button" onClick={saveProfile} className="h-11 w-full">
              Save profile
            </Button>
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--saj-green-pale)] text-[var(--saj-green)]">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[var(--saj-text)]">Dark theme</p>
              <p className="text-[11px] text-[var(--saj-muted)]">Switch between light and dark mode.</p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              className="h-6 w-11 data-[state=checked]:bg-[var(--saj-green)] data-[state=unchecked]:bg-[#d9dfdc]"
            />
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[var(--saj-green-pale)] text-[var(--saj-green)]">
              <IconQrcode className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[var(--saj-text)]">QR code</p>
              <p className="truncate text-[11px] text-[var(--saj-muted)]">
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

          <div className="mt-4 overflow-hidden rounded-3xl border border-[var(--saj-border)] bg-[var(--saj-surface)] p-3">
            {user.paymentQR?.provider === selectedProvider && user.paymentQR?.qrImage ? (
              <img src={user.paymentQR.qrImage} alt={`${selectedProvider} QR code`} className="mx-auto max-h-56 w-full object-contain" />
            ) : (
              <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-[var(--saj-border)] text-center">
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

        <section className="rounded-[20px] border border-[var(--saj-border)] bg-[var(--saj-surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-[var(--saj-text)]">Monthly budget</p>
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
          onClick={() => {
            signOutUser();
            logout();
          }}
          className="flex w-full items-center justify-between rounded-[20px] border border-[var(--saj-border)] bg-[var(--saj-surface)] px-4 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        >
          <span className="flex items-center gap-3 text-[14px] font-semibold text-[var(--saj-red)]">
            <IconLogout2 className="h-4 w-4" />
            Sign out
          </span>
          <IconChevronRight className="h-4 w-4 text-[var(--saj-hint)]" />
        </button>
      </div>
    </div>
  );
}
