import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Group, User } from "@/lib/types";
import { formatNPR } from "@/lib/utils";

interface SessionState {
  user: User | null;
  group: Group | null;
  role: "leader" | "member" | null;
  hydrated: boolean;
  setUser: (u: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  setGroup: (g: Group | null) => void;
  setRoleAs: (uid: string) => void;
  logout: () => void;
}

const Ctx = createContext<SessionState | null>(null);

const LS_USER = "sajha.user";
const LS_GROUP = "sajha.group";
const LS_ROLE = "sajha.role";

function sameUser(a: User | null, b: User | null) {
  if (a === b) return true;
  if (!a || !b) return a === b;

  return (
    a.id === b.id &&
    a.name === b.name &&
    a.email === b.email &&
    a.avatarColor === b.avatarColor &&
    a.avatarImage === b.avatarImage &&
    a.monthlyBudget === b.monthlyBudget &&
    a.phone === b.phone &&
    a.initials === b.initials &&
    a.paymentQR?.provider === b.paymentQR?.provider &&
    a.paymentQR?.name === b.paymentQR?.name &&
    a.paymentQR?.qrImage === b.paymentQR?.qrImage
  );
}

function sameGroup(a: Group | null, b: Group | null) {
  if (a === b) return true;
  if (!a || !b) return a === b;

  return (
    a.id === b.id &&
    a.name === b.name &&
    a.avatarColor === b.avatarColor &&
    a.inviteCode === b.inviteCode &&
    a.leaderId === b.leaderId &&
    a.targetDayOfMonth === b.targetDayOfMonth &&
    a.memberCount === b.memberCount &&
    a.lastUpdated === b.lastUpdated &&
    a.statusText === b.statusText &&
    a.balance === b.balance &&
    a.createdAt === b.createdAt &&
    a.memberIds.length === b.memberIds.length &&
    a.memberIds.every((memberId, index) => memberId === b.memberIds[index]) &&
    a.paymentQR?.provider === b.paymentQR?.provider &&
    a.paymentQR?.name === b.paymentQR?.name &&
    a.paymentQR?.qrImage === b.paymentQR?.qrImage
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [group, setGroupState] = useState<Group | null>(null);
  const [role, setRole] = useState<"leader" | "member" | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem(LS_USER);
      const storedGroup = sessionStorage.getItem(LS_GROUP);
      const storedRole = sessionStorage.getItem(LS_ROLE) as "leader" | "member" | null;

      if (storedUser) {
        setUserState(JSON.parse(storedUser) as User);
      }
      if (storedGroup) {
        setGroupState(JSON.parse(storedGroup) as Group);
      }
      if (storedRole === "leader" || storedRole === "member") {
        setRole(storedRole);
      }
    } catch {
      setUserState(null);
      setGroupState(null);
      setRole(null);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (user) sessionStorage.setItem(LS_USER, JSON.stringify(user));
    else sessionStorage.removeItem(LS_USER);
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated) return;
    if (group) sessionStorage.setItem(LS_GROUP, JSON.stringify(group));
    else sessionStorage.removeItem(LS_GROUP);
  }, [hydrated, group]);

  useEffect(() => {
    if (!hydrated) return;
    if (role) sessionStorage.setItem(LS_ROLE, role);
    else sessionStorage.removeItem(LS_ROLE);
  }, [hydrated, role]);

  const setUser = useCallback((next: User | null) => {
    setUserState((current) => (sameUser(current, next) ? current : next));
    setGroupState((current) => (current === null ? current : null));
    setRole((current) => (current === null ? current : null));
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUserState((current) => {
      if (!current) return current;
      return sameUser(current, { ...current, ...patch }) ? current : { ...current, ...patch };
    });
  }, []);

  const setGroup = useCallback(
    (next: Group | null) => {
      setGroupState((current) => (sameGroup(current, next) ? current : next));
      const nextRole = next ? (next.leaderId === user?.id ? "leader" : "member") : null;
      setRole((current) => (current === nextRole ? current : nextRole));
    },
    [user?.id],
  );

  const setRoleAs = useCallback(
    (uid: string) => {
      const nextRole = group?.leaderId === uid ? "leader" : "member";
      setRole((current) => (current === nextRole ? current : nextRole));
    },
    [group?.leaderId],
  );

  const logout = useCallback(() => {
    setUserState((current) => (current === null ? current : null));
    setGroupState((current) => (current === null ? current : null));
    setRole((current) => (current === null ? current : null));
  }, []);

  const value = useMemo(
    () => ({
      user,
      group,
      role,
      hydrated,
      setUser,
      updateUser,
      setGroup,
      setRoleAs,
      logout,
    }),
    [user, group, role, hydrated, setUser, updateUser, setGroup, setRoleAs, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

export { formatNPR };

export function categoryEmoji(category: string) {
  const map: Record<string, string> = {
    Groceries: "🛒",
    Vegetables: "🥬",
    Electricity: "💡",
    "Water/Gas": "🔥",
    Internet: "📶",
    Rent: "🏠",
    Transport: "🛵",
    Other: "📦",
    Contribution: "💰",
  };

  return map[category] ?? "•";
}
