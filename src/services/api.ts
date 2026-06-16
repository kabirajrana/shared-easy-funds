// Sajha API service layer.
// All data operations go through here. Functions return typed promises.
// When the backend is ready, set VITE_API_BASE_URL and flip USE_MOCK=false.

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

// ---------- MOCK DATA ----------
const iso = (d: Date) => d.toISOString();

const mockUsers: User[] = [
  { id: "u1", name: "Ram Sharma", email: "ram@sajha.app" },
  { id: "u2", name: "Sita Thapa", email: "sita@sajha.app" },
  { id: "u3", name: "Hari Gurung", email: "hari@sajha.app" },
  { id: "u4", name: "Mina Rai", email: "mina@sajha.app" },
];

let currentUserId = "u1"; // Ram = leader by default

const mockGroup: Group = {
  id: "g1",
  name: "Flat 4B – Baluwatar",
  invite_code: "SAJHA-4B23",
  leader_id: "u1",
  monthly_target: 0,
};

const mockMemberships: Membership[] = [
  { user_id: "u1", group_id: "g1", role: "leader", joined_at: iso(new Date()) },
  { user_id: "u2", group_id: "g1", role: "member", joined_at: iso(new Date()) },
  { user_id: "u3", group_id: "g1", role: "member", joined_at: iso(new Date()) },
  { user_id: "u4", group_id: "g1", role: "member", joined_at: iso(new Date()) },
];

// ---- Persistence (localStorage) ----
const LS_TXS = "sajha.transactions";
const LS_NOTIFS = "sajha.notifications";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

let mockTransactions: Transaction[] = loadJSON<Transaction[]>(LS_TXS, []);
let mockNotifications: Notification[] = loadJSON<Notification[]>(LS_NOTIFS, []);

const persistTxs = () => saveJSON(LS_TXS, mockTransactions);
const persistNotifs = () => saveJSON(LS_NOTIFS, mockNotifications);

const delay = <T,>(data: T, ms = 100) =>
  new Promise<T>((r) => setTimeout(() => r(data), ms));

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

// ---------- AUTH ----------
export const api = {
  setCurrentUser(id: string) {
    currentUserId = id;
  },
  getCurrentUserId() {
    return currentUserId;
  },

  async login(email: string, _password: string): Promise<User> {
    if (USE_MOCK) {
      const u = mockUsers.find((x) => x.email === email) ?? mockUsers[0];
      currentUserId = u.id;
      return delay(u);
    }
    return http("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: _password }) });
  },

  async register(name: string, email: string, _password: string): Promise<User> {
    if (USE_MOCK) {
      const u: User = { id: `u${Date.now()}`, name, email };
      mockUsers.push(u);
      currentUserId = u.id;
      return delay(u);
    }
    return http("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password: _password }) });
  },

  // ---------- GROUPS ----------
  async createGroup(name: string, monthly_target: number): Promise<Group> {
    if (USE_MOCK) return delay({ ...mockGroup, name, monthly_target });
    return http("/api/groups", { method: "POST", body: JSON.stringify({ name, monthly_target }) });
  },

  async joinGroup(invite_code: string): Promise<Group> {
    if (USE_MOCK) return delay({ ...mockGroup, invite_code });
    return http("/api/groups/join", { method: "POST", body: JSON.stringify({ invite_code }) });
  },

  async getGroup(id: string): Promise<Group> {
    if (USE_MOCK) return delay(mockGroup);
    return http(`/api/groups/${id}`);
  },

  // ---------- MEMBERS ----------
  async getMembers(groupId: string): Promise<MemberWithUser[]> {
    if (USE_MOCK) {
      const month = new Date().getMonth();
      const year = new Date().getFullYear();
      const out = mockMemberships.map((m) => {
        const user = mockUsers.find((u) => u.id === m.user_id)!;
        const txs = mockTransactions.filter(
          (t) => t.created_by === m.user_id && t.type === "contribution"
        );
        const monthSum = txs
          .filter((t) => new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year)
          .reduce((s, t) => s + t.amount, 0);
        const yearSum = txs
          .filter((t) => new Date(t.date).getFullYear() === year)
          .reduce((s, t) => s + t.amount, 0);
        return { membership: m, user, contributed_this_month: monthSum, contributed_this_year: yearSum };
      });
      return delay(out);
    }
    return http(`/api/groups/${groupId}/members`);
  },

  async transferLeader(groupId: string, userId: string): Promise<void> {
    if (USE_MOCK) {
      mockMemberships.forEach((m) => (m.role = m.user_id === userId ? "leader" : "member"));
      mockGroup.leader_id = userId;
      return delay(undefined);
    }
    await http(`/api/groups/${groupId}/members/${userId}/transfer-leader`, { method: "POST" });
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    if (USE_MOCK) {
      const i = mockMemberships.findIndex((m) => m.user_id === userId);
      if (i >= 0) mockMemberships.splice(i, 1);
      return delay(undefined);
    }
    await http(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
  },

  // ---------- TRANSACTIONS ----------
  async getTransactions(groupId: string): Promise<Transaction[]> {
    if (USE_MOCK) return delay([...mockTransactions].sort((a, b) => +new Date(b.date) - +new Date(a.date)));
    return http(`/api/groups/${groupId}/transactions`);
  },

  async createTransaction(
    groupId: string,
    input: Omit<Transaction, "id" | "group_id" | "created_by" | "status"> & {
      asLeader?: boolean;
    }
  ): Promise<Transaction> {
    if (USE_MOCK) {
      const status: TxStatus =
        input.type === "contribution"
          ? "unverified"
          : input.asLeader
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
      mockTransactions.unshift(tx);
      persistTxs();
      if (tx.status === "pending") {
        const u = mockUsers.find((x) => x.id === currentUserId);
        mockNotifications.unshift({
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
      const t = mockTransactions.find((x) => x.id === id);
      if (t) { t.status = "approved"; persistTxs(); }
      return delay(undefined);
    }
    await http(`/api/transactions/${id}/approve`, { method: "POST" });
  },

  async rejectTransaction(id: string, _reason?: string): Promise<void> {
    if (USE_MOCK) {
      const t = mockTransactions.find((x) => x.id === id);
      if (t) { t.status = "rejected"; persistTxs(); }
      return delay(undefined);
    }
    await http(`/api/transactions/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: _reason }) });
  },

  async verifyContribution(id: string): Promise<void> {
    if (USE_MOCK) {
      const t = mockTransactions.find((x) => x.id === id);
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
      const txs = mockTransactions;
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
      mockGroup.qr_image_url = image_url;
      mockGroup.qr_label = label;
      return delay({ ...mockGroup });
    }
    return http(`/api/groups/${groupId}/qr`, { method: "POST", body: JSON.stringify({ image_url, label }) });
  },

  async getQr(groupId: string): Promise<{ qr_image_url?: string; qr_label?: string }> {
    if (USE_MOCK) return delay({ qr_image_url: mockGroup.qr_image_url, qr_label: mockGroup.qr_label });
    return http(`/api/groups/${groupId}/qr`);
  },

  // ---------- NOTIFICATIONS ----------
  async getNotifications(): Promise<Notification[]> {
    if (USE_MOCK) return delay([...mockNotifications]);
    return http(`/api/notifications`);
  },

  async markNotificationsRead(): Promise<void> {
    if (USE_MOCK) {
      mockNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
      persistNotifs();
      return delay(undefined);
    }
    await http(`/api/notifications/read`, { method: "POST" });
  },

  // helpers
  getUserById(id: string): User | undefined {
    return mockUsers.find((u) => u.id === id);
  },
  allUsers(): User[] {
    return mockUsers;
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
