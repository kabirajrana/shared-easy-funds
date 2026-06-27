// Sajha API service layer.
// Mock backend persists users, groups, memberships, transactions, notifications
// to localStorage so the app behaves like a real multi-user app.

import { demoUsers } from "@/store/seed";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  password_hash?: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  leader_id: string;
  monthly_target: number;
  target_day_of_month?: number;
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
  type:
    | "group_invite"
    | "invite_accepted"
    | "invite_declined"
    | "request"
    | "approval"
    | "rejection"
    | "summary"
    | "low_balance";
  title: string;
  body: string;
  message?: string;
  date: string;
  created_at?: string;
  read: boolean;
  is_read?: boolean;
  recipient_id?: string;
  recipient_email?: string;
  user_id?: string;
  user_email?: string;
  meta?: {
    kind: "group_invite";
    invitationId: string;
    group_id: string;
    group_name: string;
    invite_code: string;
    sender_id?: string;
    sender_name?: string;
    status?: "pending" | "accepted" | "rejected";
  };
  data?: {
    invitationId?: string;
    groupId?: string;
    groupName?: string;
    inviterName?: string;
    inviteCode?: string;
    leaderId?: string;
    status?: "pending" | "accepted" | "declined" | "expired";
  };
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  invited_email: string;
  invited_user_id?: string;
  status: "pending" | "accepted" | "declined" | "expired";
  token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
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
const LS_INVITES = "sajha.group_invitations";
const LS_TXS = "sajha.transactions";
const LS_NOTIFS = "sajha.notifications";
const LS_CURRENT_USER = "sajha.currentUserId";
const NOTIFICATION_EVENT = "sajha:notification";
const NOTIFICATIONS_UPDATED_EVENT = "sajha:notifications-updated";

type StoredGroupLike = Partial<Group> & {
  inviteCode?: string;
  invite_code?: string;
  leaderId?: string;
  leader_id?: string;
  monthlyTarget?: number;
  monthly_target?: number;
  targetDayOfMonth?: number;
  target_day_of_month?: number;
  avatarColor?: string;
  avatar_color?: string;
  avatarImage?: string;
  avatar_url?: string;
  paymentQR?: {
    provider?: string;
    name?: string;
    qrImage?: string;
  };
  qr_image_url?: string;
  qr_label?: string;
  solo?: boolean;
};

type StoredInvitationLike = Partial<GroupInvitation> & {
  groupId?: string;
  invitedBy?: string;
  invitedEmail?: string;
  invitedUserId?: string;
  status?: GroupInvitation["status"];
  token?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  group_id?: string;
  invited_by?: string;
  invited_email?: string;
  invited_user_id?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
};

type StoredNotificationLike = Partial<Notification> & {
  message?: string;
  created_at?: string;
  is_read?: boolean;
  data?: Notification["data"];
  meta?: Notification["meta"];
  recipient_id?: string;
  recipient_email?: string;
  user_id?: string;
  user_email?: string;
  body?: string;
  date?: string;
  read?: boolean;
};

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
let invitations: GroupInvitation[] = load<GroupInvitation[]>(LS_INVITES, []);
let transactions: Transaction[] = load<Transaction[]>(LS_TXS, []);
let notifications: Notification[] = loadNotificationsSnapshot();
let currentUserId: string =
  (typeof window !== "undefined" && localStorage.getItem(LS_CURRENT_USER)) || "";

let notificationChannel: BroadcastChannel | null = null;
let notificationSyncReady = false;

function seedUsers(existing: User[]) {
  const merged = [...existing];
  for (const demo of demoUsers) {
    if (merged.some((user) => user.email.toLowerCase() === demo.email.toLowerCase())) continue;
    merged.push({
      id: demo.id,
      name: demo.name,
      email: demo.email,
    });
  }
  return merged;
}

const persistUsers = () => save(LS_USERS, users);
const persistGroups = () => save(LS_GROUPS, groups);
const persistMembers = () => save(LS_MEMBERS, memberships);
const persistInvites = () => save(LS_INVITES, invitations);
const persistTxs = () => save(LS_TXS, transactions);
const persistNotifs = () => save(LS_NOTIFS, notifications);

function emitNotificationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  getOrCreateNotificationChannel()?.postMessage({ type: NOTIFICATIONS_UPDATED_EVENT });
}

function emitNotification(notification: Notification) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: notification }));
  getOrCreateNotificationChannel()?.postMessage({ type: NOTIFICATION_EVENT, notification });
}

function getOrCreateNotificationChannel() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  if (!notificationChannel) {
    notificationChannel = new BroadcastChannel("sajha:notifications");
  }
  return notificationChannel;
}

function setupNotificationSync(onChange: () => void) {
  if (typeof window === "undefined" || notificationSyncReady) return;
  notificationSyncReady = true;

  if ("BroadcastChannel" in window) {
    notificationChannel = new BroadcastChannel("sajha:notifications");
    notificationChannel.onmessage = (event) => {
      if (event.data?.type === NOTIFICATIONS_UPDATED_EVENT || event.data?.type === NOTIFICATION_EVENT) onChange();
    };
  }

  window.addEventListener("storage", (event) => {
    if (event.key === LS_NOTIFS || event.key === LS_INVITES || event.key === LS_CURRENT_USER) onChange();
  });
}

const iso = (d: Date) => d.toISOString();
const delay = <T,>(data: T, ms = 120) =>
  new Promise<T>((r) => setTimeout(() => r(data), ms));

function normalizeGroup(raw: StoredGroupLike | unknown): Group | null {
  if (!raw || typeof raw !== "object") return null;
  const group = raw as StoredGroupLike;
  const inviteCode = group.inviteCode ?? group.invite_code;
  const leaderId = group.leaderId ?? group.leader_id;
  if (typeof inviteCode !== "string" || typeof leaderId !== "string") return null;

  return {
    id: String(group.id ?? ""),
    name: String(group.name ?? "My group"),
    invite_code: inviteCode,
    leader_id: leaderId,
    monthly_target: Number(group.monthly_target ?? group.monthlyTarget ?? 0),
    target_day_of_month: group.target_day_of_month ?? group.targetDayOfMonth,
    qr_image_url: group.qr_image_url ?? group.paymentQR?.qrImage,
    qr_label: group.qr_label ?? group.paymentQR?.name,
    avatar_url: group.avatar_url ?? group.avatarImage,
    solo: !!group.solo,
  };
}

function normalizeInvitation(raw: StoredInvitationLike | unknown): GroupInvitation | null {
  if (!raw || typeof raw !== "object") return null;
  const invite = raw as StoredInvitationLike;
  const groupId = invite.group_id ?? invite.groupId;
  const invitedBy = invite.invited_by ?? invite.invitedBy;
  const invitedEmail = invite.invited_email ?? invite.invitedEmail;
  const token = invite.token;
  if (typeof groupId !== "string" || typeof invitedBy !== "string" || typeof invitedEmail !== "string" || typeof token !== "string") {
    return null;
  }

  return {
    id: String(invite.id ?? crypto.randomUUID()),
    group_id: groupId,
    invited_by: invitedBy,
    invited_email: invitedEmail,
    invited_user_id: typeof (invite.invited_user_id ?? invite.invitedUserId) === "string"
      ? String(invite.invited_user_id ?? invite.invitedUserId)
      : undefined,
    status:
      invite.status === "accepted" || invite.status === "declined" || invite.status === "expired"
        ? invite.status
        : "pending",
    token,
    expires_at: String(invite.expires_at ?? invite.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    created_at: String(invite.created_at ?? invite.createdAt ?? new Date().toISOString()),
    updated_at: String(invite.updated_at ?? invite.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeNotification(raw: StoredNotificationLike | unknown): Notification | null {
  if (!raw || typeof raw !== "object") return null;
  const note = raw as StoredNotificationLike;
  const id = String(note.id ?? `n_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`);
  const body = String(note.body ?? note.message ?? "");
  const date = String(note.date ?? note.created_at ?? new Date().toISOString());
  const read = typeof note.read === "boolean" ? note.read : !!note.is_read;

  const meta = note.meta?.kind === "group_invite"
    ? {
        kind: "group_invite" as const,
        invitationId: String(note.meta.invitationId ?? note.data?.invitationId ?? note.data?.groupId ?? id),
        group_id: String(note.meta.group_id ?? note.data?.groupId ?? ""),
        group_name: String(note.meta.group_name ?? note.data?.groupName ?? "Group"),
        invite_code: String(note.meta.invite_code ?? note.data?.inviteCode ?? ""),
        sender_id: note.meta.sender_id ?? note.data?.leaderId,
        sender_name: note.meta.sender_name ?? note.data?.inviterName,
        status:
          note.meta.status === "accepted" || note.meta.status === "rejected" || note.meta.status === "pending"
            ? note.meta.status
            : "pending",
      }
    : note.meta;

  return {
    id,
    type:
      note.type === "group_invite" ||
      note.type === "invite_accepted" ||
      note.type === "invite_declined" ||
      note.type === "request" ||
      note.type === "approval" ||
      note.type === "rejection" ||
      note.type === "summary" ||
      note.type === "low_balance"
        ? note.type
        : "request",
    title: String(note.title ?? "Notification"),
    body,
    message: String(note.message ?? body),
    date,
    created_at: String(note.created_at ?? date),
    read,
    is_read: typeof note.is_read === "boolean" ? note.is_read : read,
    recipient_id: note.recipient_id ?? note.user_id,
    recipient_email: note.recipient_email ?? note.user_email,
    user_id: note.user_id ?? note.recipient_id,
    user_email: note.user_email ?? note.recipient_email,
    meta,
    data: note.data,
  };
}

function loadGroupsSnapshot(): Group[] {
  const rawGroups = load<unknown[]>(LS_GROUPS, []);
  return rawGroups.map(normalizeGroup).filter(Boolean) as Group[];
}

function loadInvitationsSnapshot(): GroupInvitation[] {
  const rawInvites = load<unknown[]>(LS_INVITES, []);
  return rawInvites.map(normalizeInvitation).filter(Boolean) as GroupInvitation[];
}

function loadNotificationsSnapshot(): Notification[] {
  const rawNotifs = load<unknown[]>(LS_NOTIFS, []);
  return rawNotifs.map(normalizeNotification).filter(Boolean) as Notification[];
}

function refreshGroups() {
  groups = loadGroupsSnapshot();
  return groups;
}

function refreshInvitations() {
  invitations = loadInvitationsSnapshot();
  persistInvites();
  return invitations;
}

function refreshNotifications() {
  notifications = loadNotificationsSnapshot();
  persistNotifs();
  return notifications;
}

function refreshUsers() {
  users = seedUsers(load<User[]>(LS_USERS, []));
  persistUsers();
  return users;
}

function normalizeInviteCode(value: string) {
  const cleaned = value.trim().toUpperCase();
  const match = cleaned.match(/SAJHA[-\s]*([A-Z0-9]{4})/);
  if (match) return `SAJHA-${match[1]}`;
  const compact = cleaned.replace(/[^A-Z0-9]/g, "");
  if (compact.startsWith("SAJHA") && compact.length >= 10) {
    return `SAJHA-${compact.slice(5, 9)}`;
  }
  return cleaned;
}

function genInvite(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `SAJHA-${s}`;
}

function getCurrentUser() {
  return users.find((user) => user.id === currentUserId) ?? null;
}

function createNotification(notification: Notification) {
  const normalized = normalizeNotification({
    ...notification,
    read: typeof notification.read === "boolean" ? notification.read : false,
    is_read: typeof notification.is_read === "boolean" ? notification.is_read : false,
    body: notification.body ?? notification.message ?? "",
    message: notification.message ?? notification.body ?? "",
    date: notification.date ?? new Date().toISOString(),
    created_at: notification.created_at ?? notification.date ?? new Date().toISOString(),
  });
  if (!normalized) return null;
  notifications = [normalized, ...notifications.filter((entry) => entry.id !== normalized.id)];
  persistNotifs();
  emitNotification(normalized);
  emitNotificationsChanged();
  return normalized;
}

function buildGroupInviteNotification(invitation: GroupInvitation, group: Group, sender?: User | null): Notification {
  const now = iso(new Date());
  return {
    id: `n_${invitation.id}`,
    type: "group_invite",
    title: `Group invite from ${group.name}`,
    body: `${sender?.name ?? "A group leader"} invited you to join ${group.name}.`,
    message: `${sender?.name ?? "A group leader"} invited you to join ${group.name}.`,
    date: now,
    created_at: now,
    read: false,
    is_read: false,
    recipient_id: invitation.invited_user_id,
    recipient_email: invitation.invited_email,
    data: {
      invitationId: invitation.id,
      groupId: group.id,
      groupName: group.name,
      inviterName: sender?.name,
      inviteCode: group.invite_code,
      leaderId: sender?.id ?? invitation.invited_by,
      status: invitation.status,
    },
    meta: {
      kind: "group_invite",
      invitationId: invitation.id,
      group_id: group.id,
      group_name: group.name,
      invite_code: group.invite_code,
      sender_id: sender?.id ?? invitation.invited_by,
      sender_name: sender?.name,
      status: invitation.status === "declined" ? "rejected" : invitation.status === "accepted" ? "accepted" : "pending",
    },
  };
}

function syncPendingInviteNotifications() {
  refreshInvitations();
  refreshGroups();
  refreshUsers();

  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const currentEmail = currentUser.email.toLowerCase();

  for (const invitation of invitations) {
    if (invitation.status !== "pending") continue;
    if (invitation.invited_user_id !== currentUser.id && invitation.invited_email.toLowerCase() !== currentEmail) continue;

    const group = groups.find((entry) => entry.id === invitation.group_id);
    if (!group) continue;
    const sender = users.find((entry) => entry.id === invitation.invited_by) ?? null;
    createNotification(buildGroupInviteNotification(invitation, group, sender));
  }

  persistNotifs();
}

function createInvitation(input: {
  groupId: string;
  invitedBy: string;
  invitedEmail: string;
  invitedUserId?: string;
  token?: string;
}) {
  const existing = invitations.find(
    (invite) =>
      invite.group_id === input.groupId &&
      invite.invited_email.toLowerCase() === input.invitedEmail.toLowerCase() &&
      invite.status === "pending",
  );
  if (existing) return existing;

  const invitation: GroupInvitation = {
    id: `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    group_id: input.groupId,
    invited_by: input.invitedBy,
    invited_email: input.invitedEmail,
    invited_user_id: input.invitedUserId,
    status: "pending",
    token:
      input.token ??
      refreshGroups().find((group) => group.id === input.groupId)?.invite_code ??
      genInvite(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: iso(new Date()),
    updated_at: iso(new Date()),
  };

  invitations.unshift(invitation);
  persistInvites();
  emitNotificationsChanged();
  return invitation;
}

function ensureGroupMembership(groupId: string, userId: string) {
  const already = memberships.some((m) => m.group_id === groupId && m.user_id === userId);
  if (already) return false;

  memberships.push({
    user_id: userId,
    group_id: groupId,
    role: "member",
    joined_at: iso(new Date()),
  });
  persistMembers();
  return true;
}

function getInvitationByToken(token: string) {
  const nextToken = normalizeInviteCode(token);
  return (
    invitations.find(
      (invite) =>
        invite.status === "pending" &&
        invite.expires_at > new Date().toISOString() &&
        normalizeInviteCode(invite.token) === nextToken,
    ) ?? null
  );
}

function getNotificationVisibilityPredicate() {
  const currentEmail = getCurrentUser()?.email?.toLowerCase();
  return (n: Notification) =>
    !n.recipient_id ||
    n.recipient_id === currentUserId ||
    (!!currentEmail && n.recipient_email?.toLowerCase() === currentEmail);
}

async function hashPassword(pw: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`sajha:${pw}`));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback (very old browsers): non-cryptographic, but keeps the flow working.
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = (h * 31 + pw.charCodeAt(i)) | 0;
  return `f${h}`;
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
    if (id) {
      refreshUsers();
      syncPendingInviteNotifications();
    }
  },
  getCurrentUserId() {
    return currentUserId;
  },

  // ---------- AUTH ----------
  async login(email: string, password: string): Promise<User> {
    if (USE_MOCK) {
      refreshUsers();
      const e = email.trim().toLowerCase();
      const u = users.find((x) => x.email.toLowerCase() === e);
      if (!u) throw new Error("No account found for that email. Please sign up first.");
      const hash = await hashPassword(password);
      if (u.password_hash && u.password_hash !== hash) {
        throw new Error("Incorrect password. Please try again.");
      }
      // Backfill hash for any legacy account created before passwords were enforced.
      if (!u.password_hash) {
        u.password_hash = hash;
        persistUsers();
      }
      api.setCurrentUser(u.id);
      return delay({ ...u, password_hash: undefined });
    }
    return http("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },

  async register(name: string, email: string, password: string): Promise<User> {
    if (USE_MOCK) {
      refreshUsers();
      const e = email.trim().toLowerCase();
      if (!name.trim()) throw new Error("Please enter your full name.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("Please enter a valid email.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (users.some((x) => x.email.toLowerCase() === e)) {
        throw new Error("An account with this email already exists. Try logging in.");
      }
      const u: User = {
        id: `u${Date.now()}`,
        name: name.trim(),
        email: e,
        password_hash: await hashPassword(password),
      };
      users.push(u);
      persistUsers();
      api.setCurrentUser(u.id);
      return delay({ ...u, password_hash: undefined });
    }
    return http("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
  },

  // ---------- GROUPS ----------
  async createGroup(
    name: string,
    monthly_target: number,
    opts?: { solo?: boolean; memberEmails?: string[]; targetDayOfMonth?: number }
  ): Promise<Group> {
    if (USE_MOCK) {
      if (!currentUserId) throw new Error("Please sign in first.");
      refreshUsers();
      const g: Group = {
        id: `g${Date.now()}`,
        name: name.trim() || "My group",
        invite_code: genInvite(),
        leader_id: currentUserId,
        monthly_target,
        target_day_of_month: opts?.targetDayOfMonth,
        solo: !!opts?.solo,
      };
      groups.push(g);
      memberships.push({
        user_id: currentUserId,
        group_id: g.id,
        role: "leader",
        joined_at: iso(new Date()),
      });
      persistGroups();
      persistMembers();

      if (!opts?.solo && opts?.memberEmails?.length) {
        const sender = getCurrentUser();
        for (const email of opts.memberEmails) {
          const targetUser = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
          if (targetUser?.id === currentUserId) continue;
          const invitation = createInvitation({
            groupId: g.id,
            invitedBy: sender?.id ?? currentUserId,
            invitedEmail: targetUser?.email ?? email,
            invitedUserId: targetUser?.id,
            token: g.invite_code,
          });
          if (targetUser) {
            createNotification({
              id: `n${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
              type: "group_invite",
              title: `Group invite from ${g.name}`,
              body: `${sender?.name ?? "A group leader"} invited you to join ${g.name}.`,
              message: `${sender?.name ?? "A group leader"} invited you to join ${g.name}.`,
              date: iso(new Date()),
              created_at: iso(new Date()),
              read: false,
              is_read: false,
              recipient_id: targetUser.id,
              recipient_email: targetUser.email,
              data: {
                invitationId: invitation.id,
                groupId: g.id,
                groupName: g.name,
                inviterName: sender?.name,
                inviteCode: g.invite_code,
                leaderId: sender?.id ?? currentUserId,
                status: "pending",
              },
              meta: {
                kind: "group_invite",
                invitationId: invitation.id,
                group_id: g.id,
                group_name: g.name,
                invite_code: g.invite_code,
                sender_id: sender?.id,
                sender_name: sender?.name,
                status: "pending",
              },
            });
          }
        }
      }

      return delay(g);
    }
    return http("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name, monthly_target, ...opts }),
    });
  },

  async joinGroup(invite_code: string): Promise<Group> {
    if (USE_MOCK) {
      if (!currentUserId) throw new Error("Please sign in first.");
      const nextCode = normalizeInviteCode(invite_code);
      const invitation = getInvitationByToken(nextCode);
      const g =
        (invitation ? refreshGroups().find((x) => x.id === invitation.group_id) : null) ??
        refreshGroups().find((x) => normalizeInviteCode(x.invite_code) === nextCode);
      if (!g) throw new Error("Invalid invite code. Ask the leader to share it again.");
      if (g.solo) throw new Error("This is a solo fund and does not accept members.");
      ensureGroupMembership(g.id, currentUserId);
      if (invitation) {
        invitation.status = "accepted";
        invitation.updated_at = iso(new Date());
        persistInvites();
      }
      return delay(g);
    }
    return http("/api/groups/join", { method: "POST", body: JSON.stringify({ invite_code }) });
  },

  async sendGroupInvite(groupId: string, email: string): Promise<void> {
    if (USE_MOCK) {
      if (!currentUserId) throw new Error("Please sign in first.");
      refreshUsers();
      const g = refreshGroups().find((x) => x.id === groupId);
      if (!g) throw new Error("Group not found");
      const recipientEmail = email.trim().toLowerCase();
      const targetUser = users.find((x) => x.email.toLowerCase() === recipientEmail);
      if (targetUser?.id === currentUserId) throw new Error("You cannot invite yourself.");
      const invitation = createInvitation({
        groupId: g.id,
        invitedBy: currentUserId,
        invitedEmail: recipientEmail,
        invitedUserId: targetUser?.id,
        token: g.invite_code,
      });
      if (targetUser) {
        createNotification(buildGroupInviteNotification(invitation, g, getCurrentUser()));
      }
      return delay(undefined);
    }
    await http(`/api/groups/${groupId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async acceptGroupInvite(notificationId: string): Promise<void> {
    if (USE_MOCK) {
      refreshNotifications();
      const n = notifications.find((item) => item.id === notificationId);
      if (!n?.meta || n.meta.kind !== "group_invite") return delay(undefined);
      const targetUser = getCurrentUser();
      if (!targetUser) throw new Error("Please sign in first.");
      const invitation = invitations.find((item) => item.id === n.meta!.invitationId);
      const g = refreshGroups().find(
        (group) =>
          group.id === n.meta!.group_id ||
          normalizeInviteCode(group.invite_code) === normalizeInviteCode(n.meta!.invite_code),
      );
      if (!g) throw new Error("Invite group could not be found.");
      if (invitation && invitation.status !== "pending") {
        throw new Error("This invite has already been handled.");
      }
      ensureGroupMembership(g.id, targetUser.id);
      if (invitation) {
        invitation.status = "accepted";
        invitation.invited_user_id = targetUser.id;
        invitation.updated_at = iso(new Date());
        persistInvites();
      }
      n.read = true;
      n.is_read = true;
      n.meta.status = "accepted";
      n.data = { ...(n.data ?? {}), status: "accepted" };
      persistNotifs();
      emitNotificationsChanged();
      if (n.meta.sender_id) {
        createNotification({
          id: `n${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          type: "invite_accepted",
          title: `${targetUser.name} accepted your invite`,
          body: `${targetUser.name} joined ${g.name}.`,
          message: `${targetUser.name} joined ${g.name}.`,
          date: iso(new Date()),
          created_at: iso(new Date()),
          read: false,
          is_read: false,
          recipient_id: n.meta.sender_id,
          data: {
            invitationId: n.meta.invitationId,
            groupId: g.id,
            groupName: g.name,
            inviterName: targetUser.name,
            inviteCode: g.invite_code,
            leaderId: targetUser.id,
            status: "accepted",
          },
          meta: {
            kind: "group_invite",
            invitationId: n.meta.invitationId,
            group_id: g.id,
            group_name: g.name,
            invite_code: g.invite_code,
            sender_id: targetUser.id,
            sender_name: targetUser.name,
            status: "accepted",
          },
        });
      }
      return delay(undefined);
    }
    await http(`/api/notifications/${notificationId}/accept`, { method: "POST" });
  },

  async declineGroupInvite(notificationId: string): Promise<void> {
    if (USE_MOCK) {
      refreshNotifications();
      const n = notifications.find((item) => item.id === notificationId);
      if (!n?.meta || n.meta.kind !== "group_invite") return delay(undefined);
      const targetUser = getCurrentUser();
      if (!targetUser) throw new Error("Please sign in first.");
      const invitation = invitations.find((item) => item.id === n.meta!.invitationId);
      if (invitation && invitation.status !== "pending") {
        throw new Error("This invite has already been handled.");
      }
      if (invitation) {
        invitation.status = "declined";
        invitation.updated_at = iso(new Date());
        persistInvites();
      }
      n.read = true;
      n.is_read = true;
      n.meta.status = "rejected";
      n.data = { ...(n.data ?? {}), status: "declined" };
      persistNotifs();
      emitNotificationsChanged();
      if (n.meta.sender_id) {
        createNotification({
          id: `n${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          type: "invite_declined",
          title: `${targetUser.name} declined your invite`,
          body: `${targetUser.name} did not join ${n.meta.group_name}.`,
          message: `${targetUser.name} did not join ${n.meta.group_name}.`,
          date: iso(new Date()),
          created_at: iso(new Date()),
          read: false,
          is_read: false,
          recipient_id: n.meta.sender_id,
          data: {
            invitationId: n.meta.invitationId,
            groupId: n.meta.group_id,
            groupName: n.meta.group_name,
            inviterName: targetUser.name,
            inviteCode: n.meta.invite_code,
            leaderId: targetUser.id,
            status: "declined",
          },
          meta: {
            kind: "group_invite",
            invitationId: n.meta.invitationId,
            group_id: n.meta.group_id,
            group_name: n.meta.group_name,
            invite_code: n.meta.invite_code,
            sender_id: targetUser.id,
            sender_name: targetUser.name,
            status: "rejected",
          },
        });
      }
      return delay(undefined);
    }
    await http(`/api/notifications/${notificationId}/decline`, { method: "POST" });
  },

  async getGroup(id: string): Promise<Group> {
    if (USE_MOCK) {
      const g = refreshGroups().find((x) => x.id === id);
      if (!g) throw new Error("Group not found");
      return delay(g);
    }
    return http(`/api/groups/${id}`);
  },

  async updateGroup(id: string, patch: Partial<Group>): Promise<Group> {
    if (USE_MOCK) {
      const g = refreshGroups().find((x) => x.id === id);
      if (!g) throw new Error("Group not found");
      Object.assign(g, patch);
      persistGroups();
      return delay({ ...g });
    }
    return http(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },

  async myGroups(): Promise<Group[]> {
    if (USE_MOCK) {
      refreshGroups();
      const ids = memberships.filter((m) => m.user_id === currentUserId).map((m) => m.group_id);
      return delay(groups.filter((g) => ids.includes(g.id)));
    }
    return http(`/api/groups/mine`);
  },

  // ---------- MEMBERS ----------
  async getMembers(groupId: string): Promise<MemberWithUser[]> {
    if (USE_MOCK) {
      refreshUsers();
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
      refreshUsers();
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
      const g = refreshGroups().find((x) => x.id === groupId);
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
      const g = refreshGroups().find((x) => x.id === groupId);
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
      const g = refreshGroups().find((x) => x.id === groupId);
      return delay({ qr_image_url: g?.qr_image_url, qr_label: g?.qr_label });
    }
    return http(`/api/groups/${groupId}/qr`);
  },

  // ---------- NOTIFICATIONS ----------
  async getNotifications(options?: { unreadOnly?: boolean }): Promise<Notification[]> {
    if (USE_MOCK) {
      syncPendingInviteNotifications();
      const visible = refreshNotifications()
        .filter(getNotificationVisibilityPredicate())
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        .filter((n) => (options?.unreadOnly ? !n.read : true));
      return delay([...visible]);
    }
    const suffix = options?.unreadOnly ? "?unread=true" : "";
    return http(`/api/notifications${suffix}`);
  },

  async markNotificationsRead(): Promise<void> {
    return api.markAllNotificationsRead();
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    if (USE_MOCK) {
      const predicate = getNotificationVisibilityPredicate();
      notifications = notifications.map((n) => (n.id === notificationId && predicate(n) ? { ...n, read: true, is_read: true } : n));
      persistNotifs();
      emitNotificationsChanged();
      return delay(undefined);
    }
    await http(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
  },

  async markAllNotificationsRead(): Promise<void> {
    if (USE_MOCK) {
      const predicate = getNotificationVisibilityPredicate();
      notifications = notifications.map((n) =>
        predicate(n) ? { ...n, read: true, is_read: true } : n,
      );
      persistNotifs();
      emitNotificationsChanged();
      return delay(undefined);
    }
    await http(`/api/notifications/read-all`, { method: "PATCH" });
  },

  async deleteGroupArtifacts(groupId: string): Promise<void> {
    if (USE_MOCK) {
      invitations = invitations.filter((invite) => invite.group_id !== groupId);
      notifications = notifications.filter((notification) => {
        const notificationGroupId = notification.data?.groupId ?? notification.meta?.group_id;
        return notificationGroupId !== groupId;
      });
      persistInvites();
      persistNotifs();
      emitNotificationsChanged();
      return delay(undefined);
    }
    await http(`/api/groups/${groupId}`, { method: "DELETE" });
  },

  // helpers
  getUserById(id: string): User | undefined {
    refreshUsers();
    return users.find((u) => u.id === id);
  },
  allUsers(): User[] {
    return refreshUsers();
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
