// Sajha API service layer.
// Mock backend persists users, groups, memberships, transactions, notifications
// to localStorage so the app behaves like a real multi-user app.

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  leader_id: string;
  monthly_target: number;
  qr_image_url?: string;
  qr_label?: string;
  avatar_url?: string;
  solo?: boolean;
}

export interface Membership {
  user_id: string;
  group_id: string;
  role: "leader" | "member";
  joined_at: string;
}

export type TxStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "verified"
  | "unverified";

export interface Transaction {
  id: string;
  group_id: string;
  type: "expense" | "contribution";
  category: string;
  amount: number;
  description?: string;
  date: string;
  created_by: string;
  status: TxStatus;
  receipt_url?: string;
}

export interface Notification {
  id: string;
  type: "request" | "approval" | "rejection" | "summary" | "low_balance";
  title: string;
  body: string;
  date: string;
  read: boolean;
}

export interface MemberWithUser {
  membership: Membership;
  user: User;
  contributed_this_month: number;
  contributed_this_year: number;
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "";
const USE_MOCK = !BASE_URL;

// ---------- Persistence ----------
const LS_USERS = "sajha.users";
const LS_GROUPS = "sajha.groups";
const LS_MEMBERS = "sajha.memberships";
const LS_TXS = "sajha.transactions";
const LS_NOTIFS = "sajha.notifications";
const LS_CURRENT_USER = "sajha.currentUserId";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

let users: User[] = load<User[]>(LS_USERS, []);
let groups: Group[] = load<Group[]>(LS_GROUPS, []);
let memberships: Membership[] = load<Membership[]>(LS_MEMBERS, []);
let transactions: Transaction[] = load<Transaction[]>(LS_TXS, []);
let notifications: Notification[] = load<Notification[]>(LS_NOTIFS, []);
let currentUserId: string =
  (typeof window !== "undefined" && localStorage.getItem(LS_CURRENT_USER)) || "";

const persistUsers = () => save(LS_USERS, users);
const persistGroups = () => save(LS_GROUPS, groups);
const persistMembers = () => save(LS_MEMBERS, memberships);
const persistTxs = () => save(LS_TXS, transactions);
const persistNotifs = () => save(LS_NOTIFS, notifications);

const iso = (d: Date) => d.toISOString();
const delay = <T,>(data: T, ms = 120) =>
  new Promise<T>((r) => setTimeout(() => r(data), ms));

function genInvite(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `SAJHA-${s}`;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  setCurrentUser(id: string) {
    currentUserId = id;
    if (typeof window !== "undefined") localStorage.setItem(LS_CURRENT_USER, id);
  },
  getCurrentUserId() {
    return currentUserId;
  },

  // ---------- AUTH ----------
  async login(email: string, _password: string): Promise<User> {
    if (USE_MOCK) {
      const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (!u) throw new Error("No account found for that email. Please register first.");
      api.setCurrentUser(u.id);
      return delay(u);
    }
    return http("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: _password }) });
  },

  async register(name: string, email: string, _password: string): Promise<User> {
    if (USE_MOCK) {
      if (users.some((x) => x.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
      }
      const u: User = { id: `u${Date.now()}`, name: name.trim(), email: email.trim() };
      users.push(u);
      persistUsers();
      api.setCurrentUser(u.id);
      return delay(u);
    }
    return http("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password: _password }) });
  },

  // ---------- GROUPS ----------
  async createGroup(
    name: string,
    monthly_target: number,
    opts?: { solo?: boolean; memberEmails?: string[] }
  ): Promise<Group> {
    if (USE_MOCK) {
      if (!currentUserId) throw new Error("Please sign in first.");
      const g: Group = {
        id: `g${Date.now()}`,
        name: name.trim() || "My group",
        invite_code: genInvite(),
        leader_id: currentUserId,
        monthly_target,
        solo: !!opts?.solo,
      };
      groups.push(g);
      memberships.push({
        user_id: currentUserId,
        group_id: g.id,
        role: "leader",
        joined_at: iso(new Date()),
      });
      // Add any pre-invited members (must already be registered)
      if (!opts?.solo && opts?.memberEmails?.length) {
        for (const email of opts.memberEmails) {
          const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
          if (u && u.id !== currentUserId) {
            memberships.push({
              user_id: u.id,
              group_id: g.id,
              role: "member",
              joined_at: iso(new Date()),
            });
          }
        }
      }
      persistGroups();
      persistMembers();
      return delay(g);
    }
    return http("/api/groups", { method: "POST", body: JSON.stringify({ name, monthly_target, ...opts }) });
  },

  async joinGroup(invite_code: string): Promise<Group> {
    if (USE_MOCK) {
      if (!currentUserId) throw new Error("Please sign in first.");
      const g = groups.find(
        (x) => x.invite_code.toUpperCase() === invite_code.trim().toUpperCase()
      );
      if (!g) throw new Error("Invalid invite code. Ask the leader to share it again.");
      if (g.solo) throw new Error("This is a solo fund and does not accept members.");
      const already = memberships.some(
        (m) => m.group_id === g.id && m.user_id === currentUserId
      );
      if (!already) {
        memberships.push({
          user_id: currentUserId,
          group_id: g.id,
          role: "member",
          joined_at: iso(new Date()),
        });
        persistMembers();
      }
      return delay(g);
    }
    return http("/api/groups/join", { method: "POST", body: JSON.stringify({ invite_code }) });
  },

  async getGroup(id: string): Promise<Group> {
    if (USE_MOCK) {
      const g = groups.find((x) => x.id === id);
      if (!g) throw new Error("Group not found");
      return delay(g);
    }
    return http(`/api/groups/${id}`);
  },

  async updateGroup(id: string, patch: Partial<Group>): Promise<Group> {
    if (USE_MOCK) {
      const g = groups.find((x) => x.id === id);
      if (!g) throw new Error("Group not found");
      Object.assign(g, patch);
      persistGroups();
      return delay({ ...g });
    }
    return http(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  async myGroups(): Promise<Group[]> {
    if (USE_MOCK) {
      const ids = memberships.filter((m) => m.user_id === currentUserId).map((m) => m.group_id);
      return delay(groups.filter((g) => ids.includes(g.id)));
    }
    return http(`/api/groups/mine`);
  },

  // ---------- MEMBERS ----------
  async getMembers(groupId: string): Promise<MemberWithUser[]> {
    if (USE_MOCK) {
      const month = new Date().getMonth();
      const year = new Date().getFullYear();
      const out = memberships
        .filter((m) => m.group_id === groupId)
        .map((m) => {
          const user = users.find((u) => u.id === m.user_id);
          if (!user) return null;
          const txs = transactions.filter(
            (t) => t.group_id === groupId && t.created_by === m.user_id && t.type === "contribution"
          );
          const monthSum = txs
            .filter((t) => new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year)
            .reduce((s, t) => s + t.amount, 0);
          const yearSum = txs
            .filter((t) => new Date(t.date).getFullYear() === year)
            .reduce((s, t) => s + t.amount, 0);
          return { membership: m, user, contributed_this_month: monthSum, contributed_this_year: yearSum };
        })
        .filter(Boolean) as MemberWithUser[];
      return delay(out);
    }
    return http(`/api/groups/${groupId}/members`);
  },

  async addMemberByEmail(groupId: string, email: string): Promise<MemberWithUser> {
    if (USE_MOCK) {
      const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (!u) throw new Error("No registered user with that email. Ask them to sign up first.");
      if (memberships.some((m) => m.group_id === groupId && m.user_id === u.id)) {
        throw new Error("That user is already in the group.");
      }
      const m: Membership = { user_id: u.id, group_id: groupId, role: "member", joined_at: iso(new Date()) };
      memberships.push(m);
      persistMembers();
      return delay({ membership: m, user: u, contributed_this_month: 0, contributed_this_year: 0 });
    }
    return http(`/api/groups/${groupId}/members`, { method: "POST", body: JSON.stringify({ email }) });
  },

  async transferLeader(groupId: string, userId: string): Promise<void> {
    if (USE_MOCK) {
      memberships.forEach((m) => {
        if (m.group_id === groupId) m.role = m.user_id === userId ? "leader" : "member";
      });
      const g = groups.find((x) => x.id === groupId);
      if (g) g.leader_id = userId;
      persistMembers();
      persistGroups();
      return delay(undefined);
    }
    await http(`/api/groups/${groupId}/members/${userId}/transfer-leader`, { method: "POST" });
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    if (USE_MOCK) {
      const i = memberships.findIndex((m) => m.group_id === groupId && m.user_id === userId);
      if (i >= 0) memberships.splice(i, 1);
      persistMembers();
      return delay(undefined);
    }
    await http(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
  },

  // ---------- TRANSACTIONS ----------
  async getTransactions(groupId: string): Promise<Transaction[]> {
    if (USE_MOCK)
      return delay(
        transactions
          .filter((t) => t.group_id === groupId)
          .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      );
    return http(`/api/groups/${groupId}/transactions`);
  },

  async createTransaction(
    groupId: string,
    input: Omit<Transaction, "id" | "group_id" | "created_by" | "status"> & {
      asLeader?: boolean;
    }
  ): Promise<Transaction> {
    if (USE_MOCK) {
      const g = groups.find((x) => x.id === groupId);
      const isSolo = !!g?.solo;
      const status: TxStatus =
        input.type === "contribution"
          ? "verified"
          : isSolo || input.asLeader
          ? "approved"
          : "pending";
      const tx: Transaction = {
        id: `t${Date.now()}`,
        group_id: groupId,
        created_by: currentUserId,
        status,
        type: input.type,
        category: input.category,
        amount: input.amount,
        description: input.description,
        date: input.date,
        receipt_url: input.receipt_url,
      };
      transactions.unshift(tx);
      persistTxs();
      if (tx.status === "pending") {
        const u = users.find((x) => x.id === currentUserId);
        notifications.unshift({
          id: `n${Date.now()}`,
          type: "request",
          title: "New spend request",
          body: `${u?.name.split(" ")[0] ?? "Member"} requested NPR ${tx.amount.toLocaleString("en-IN")} for ${tx.category}`,
          date: iso(new Date()),
          read: false,
        });
        persistNotifs();
      }
      return delay(tx);
    }
    return http(`/api/groups/${groupId}/transactions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async approveTransaction(id: string): Promise<void> {
    if (USE_MOCK) {
      const t = transactions.find((x) => x.id === id);
      if (t) { t.status = "approved"; persistTxs(); }
      return delay(undefined);
    }
    await http(`/api/transactions/${id}/approve`, { method: "POST" });
  },

  async rejectTransaction(id: string, _reason?: string): Promise<void> {
    if (USE_MOCK) {
      const t = transactions.find((x) => x.id === id);
      if (t) { t.status = "rejected"; persistTxs(); }
      return delay(undefined);
    }
    await http(`/api/transactions/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: _reason }) });
  },

  async verifyContribution(id: string): Promise<void> {
    if (USE_MOCK) {
      const t = transactions.find((x) => x.id === id);
      if (t) { t.status = "verified"; persistTxs(); }
      return delay(undefined);
    }
    await http(`/api/transactions/${id}/verify`, { method: "POST" });
  },

  // ---------- REPORTS ----------
  async getReports(groupId: string, _period?: string): Promise<{
    byCategory: Record<string, number>;
    monthly: { month: string; contributions: number; expenses: number }[];
  }> {
    if (USE_MOCK) {
      const txs = transactions.filter((t) => t.group_id === groupId);
      const byCat: Record<string, number> = {};
      txs.filter((t) => t.type === "expense" && t.status === "approved").forEach((t) => {
        byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
      });
      const monthly: { month: string; contributions: number; expenses: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = d.toLocaleString("en", { month: "short" });
        const ms = txs.filter(
          (t) => new Date(t.date).getMonth() === d.getMonth() && new Date(t.date).getFullYear() === d.getFullYear()
        );
        monthly.push({
          month: label,
          contributions: ms.filter((t) => t.type === "contribution").reduce((s, t) => s + t.amount, 0),
          expenses: ms.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
        });
      }
      return delay({ byCategory: byCat, monthly });
    }
    return http(`/api/groups/${groupId}/reports?period=${_period ?? "month"}`);
  },

  // ---------- QR ----------
  async uploadQr(groupId: string, image_url: string, label: string): Promise<Group> {
    if (USE_MOCK) {
      const g = groups.find((x) => x.id === groupId);
      if (!g) throw new Error("Group not found");
      g.qr_image_url = image_url;
      g.qr_label = label;
      persistGroups();
      return delay({ ...g });
    }
    return http(`/api/groups/${groupId}/qr`, { method: "POST", body: JSON.stringify({ image_url, label }) });
  },

  async getQr(groupId: string): Promise<{ qr_image_url?: string; qr_label?: string }> {
    if (USE_MOCK) {
      const g = groups.find((x) => x.id === groupId);
      return delay({ qr_image_url: g?.qr_image_url, qr_label: g?.qr_label });
    }
    return http(`/api/groups/${groupId}/qr`);
  },

  // ---------- NOTIFICATIONS ----------
  async getNotifications(): Promise<Notification[]> {
    if (USE_MOCK) return delay([...notifications]);
    return http(`/api/notifications`);
  },

  async markNotificationsRead(): Promise<void> {
    if (USE_MOCK) {
      notifications = notifications.map((n) => ({ ...n, read: true }));
      persistNotifs();
      return delay(undefined);
    }
    await http(`/api/notifications/read`, { method: "POST" });
  },

  // helpers
  getUserById(id: string): User | undefined {
    return users.find((u) => u.id === id);
  },
  allUsers(): User[] {
    return users;
  },
};

export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Vegetables",
  "Electricity",
  "Water/Gas",
  "Internet",
  "Rent",
  "Transport",
  "Other",
] as const;
