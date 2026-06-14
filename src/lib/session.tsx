import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User, type Group } from "@/services/api";

interface SessionState {
  user: User | null;
  group: Group | null;
  role: "leader" | "member" | null;
  setUser: (u: User | null) => void;
  setGroup: (g: Group | null) => void;
  setRoleAs: (uid: string) => void;
  logout: () => void;
}

const Ctx = createContext<SessionState | null>(null);

const LS_USER = "sajha.user";
const LS_GROUP = "sajha.group";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [role, setRole] = useState<"leader" | "member" | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem(LS_USER);
      const g = localStorage.getItem(LS_GROUP);
      if (u) {
        const parsed = JSON.parse(u) as User;
        setUser(parsed);
        api.setCurrentUser(parsed.id);
      }
      if (g) setGroup(JSON.parse(g));
    } catch {}
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
    else localStorage.removeItem(LS_USER);
  }, [user]);

  useEffect(() => {
    if (group) localStorage.setItem(LS_GROUP, JSON.stringify(group));
    else localStorage.removeItem(LS_GROUP);
  }, [group]);

  useEffect(() => {
    if (user && group) {
      setRole(group.leader_id === user.id ? "leader" : "member");
    } else {
      setRole(null);
    }
  }, [user, group]);

  const setRoleAs = (uid: string) => {
    if (group) setRole(group.leader_id === uid ? "leader" : "member");
  };

  const logout = () => {
    setUser(null);
    setGroup(null);
    setRole(null);
  };

  return (
    <Ctx.Provider value={{ user, group, role, setUser, setGroup, setRoleAs, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

export function formatNPR(n: number) {
  return "NPR " + n.toLocaleString("en-IN");
}

export function categoryEmoji(cat: string) {
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
  return map[cat] ?? "•";
}
