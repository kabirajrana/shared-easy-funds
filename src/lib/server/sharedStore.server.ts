import { constants as fsConstants, promises as fs } from "node:fs";
import path from "node:path";
import type { ChatMessage, Expense } from "@/types";

export type SharedGroup = {
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
};

export type SharedMembership = {
  user_id: string;
  user_name: string;
  user_email: string;
  group_id: string;
  role: "leader" | "member";
  joined_at: string;
};

export type SharedInvitation = {
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
};

export type SharedNotification = {
  id: string;
  type:
    | "group_invite"
    | "invite_accepted"
    | "invite_declined"
    | "expense_added"
    | "group_deleted"
    | "request"
    | "approval"
    | "rejection"
    | "summary"
    | "low_balance";
  title: string;
  body: string;
  message?: string;
  date: string;
  created_at: string;
  read: boolean;
  is_read: boolean;
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
    leaderName?: string;
    status?: "pending" | "accepted" | "declined" | "expired";
    expenseId?: string;
    expenseTitle?: string;
    expenseAmount?: number;
    paidByName?: string;
    paidById?: string;
  };
};

type SharedState = {
  groups: SharedGroup[];
  memberships: SharedMembership[];
  invitations: SharedInvitation[];
  notifications: SharedNotification[];
  expenses: Expense[];
  messages: ChatMessage[];
};

const STORE_FILENAME = ".sajha-server-store.json";
const WORKSPACE_STORE_PATH = path.resolve(process.cwd(), STORE_FILENAME);
const TEMP_STORE_PATH = path.join("/tmp", STORE_FILENAME);

function normalizePath(value: string) {
  return value.replace(/\\/g, "/");
}

function isReadOnlyPath(value: string) {
  const normalized = normalizePath(value);
  return normalized.startsWith("/var/task/") || normalized === "/var/task" || normalized.startsWith("/workspace/") || normalized === "/workspace";
}

function getCandidateStorePaths() {
  return [WORKSPACE_STORE_PATH, TEMP_STORE_PATH].filter((candidate) => !isReadOnlyPath(candidate));
}

async function canWriteToPath(filePath: string) {
  if (isReadOnlyPath(filePath)) return false;
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.access(path.dirname(filePath), fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveWritableStorePath() {
  for (const candidate of getCandidateStorePaths()) {
    if (await canWriteToPath(candidate)) return candidate;
  }
  return null;
}

function getReadableStorePaths() {
  return [WORKSPACE_STORE_PATH, TEMP_STORE_PATH];
}

let cachedState: SharedState | null = null;
let cachedStorePath = WORKSPACE_STORE_PATH;
let memoryOnlyStore = false;

function emptyState(): SharedState {
  return {
    groups: [],
    memberships: [],
    invitations: [],
    notifications: [],
    expenses: [],
    messages: [],
  };
}

async function loadState() {
  if (cachedState) return cachedState;
  const writablePath = await resolveWritableStorePath();
  if (writablePath) {
    cachedStorePath = writablePath;
    memoryOnlyStore = false;
  } else {
    memoryOnlyStore = true;
  }
  for (const candidate of getReadableStorePaths()) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      cachedState = JSON.parse(raw) as SharedState;
      return cachedState;
    } catch {
      // Try the next candidate.
    }
  }
  cachedState = emptyState();
  return cachedState;
}

async function saveState(next: SharedState) {
  cachedState = next;
  const payload = JSON.stringify(next, null, 2);

  if (memoryOnlyStore) return;

  const fallbackPath = await resolveWritableStorePath();
  const candidates = [cachedStorePath, ...(fallbackPath && fallbackPath !== cachedStorePath ? [fallbackPath] : [])];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      await fs.mkdir(path.dirname(candidate), { recursive: true });
      await fs.writeFile(candidate, payload, "utf8");
      cachedStorePath = candidate;
      return;
    } catch (error: any) {
      const code = error?.code;
      lastError = error;
      if (code !== "EROFS" && code !== "EACCES" && code !== "EPERM") throw error;
    }
  }

  memoryOnlyStore = true;
  if (lastError && typeof lastError === "object" && "code" in lastError) {
    const code = (lastError as { code?: string }).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") return;
  }
}

function iso(date = new Date()) {
  return date.toISOString();
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

function makeInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 4; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return `SAJHA-${token}`;
}

function buildNotification(input: {
  invitation: SharedInvitation;
  group: SharedGroup;
  senderName: string;
  senderId: string;
  recipientEmail: string;
  recipientId?: string;
}): SharedNotification {
  const now = iso();
  return {
    id: `n_${input.invitation.id}`,
    type: "group_invite",
    title: `Group invite from ${input.group.name}`,
    body: `${input.senderName} invited you to join ${input.group.name}.`,
    message: `${input.senderName} invited you to join ${input.group.name}.`,
    date: now,
    created_at: now,
    read: false,
    is_read: false,
    recipient_id: input.recipientId,
    recipient_email: input.recipientEmail,
    user_id: input.recipientId,
    user_email: input.recipientEmail,
    data: {
      invitationId: input.invitation.id,
      groupId: input.group.id,
      groupName: input.group.name,
      inviterName: input.senderName,
      inviteCode: input.group.invite_code,
      leaderId: input.senderId,
      status: input.invitation.status,
    },
    meta: {
      kind: "group_invite",
      invitationId: input.invitation.id,
      group_id: input.group.id,
      group_name: input.group.name,
      invite_code: input.group.invite_code,
      sender_id: input.senderId,
      sender_name: input.senderName,
      status: input.invitation.status === "declined" ? "rejected" : input.invitation.status === "accepted" ? "accepted" : "pending",
    },
  };
}

function buildExpenseNotification(input: {
  expense: Expense;
  group: SharedGroup;
  recipient: SharedMembership;
  actorName: string;
  actorId: string;
}): SharedNotification {
  const now = iso();
  return {
    id: `n_exp_${input.expense.id}_${input.recipient.user_id}`,
    type: "expense_added",
    title: `${input.actorName} added NPR ${input.expense.amount.toLocaleString("en-IN")}`,
    body: `${input.expense.title ?? input.expense.description} was added to ${input.group.name}.`,
    message: `${input.actorName} added NPR ${input.expense.amount.toLocaleString("en-IN")} for ${input.expense.title ?? input.expense.description} in ${input.group.name}.`,
    date: now,
    created_at: now,
    read: false,
    is_read: false,
    recipient_id: input.recipient.user_id,
    recipient_email: input.recipient.user_email,
    user_id: input.recipient.user_id,
    user_email: input.recipient.user_email,
    data: {
      groupId: input.group.id,
      groupName: input.group.name,
      inviterName: input.actorName,
      inviteCode: input.group.invite_code,
      leaderId: input.actorId,
      status: "accepted",
      expenseId: input.expense.id,
      expenseTitle: input.expense.title ?? input.expense.description,
      expenseAmount: input.expense.amount,
      paidByName: input.actorName,
      paidById: input.actorId,
    },
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function persist(state: SharedState) {
  await saveState(state);
}

export async function readSharedState() {
  return loadState();
}

export async function createSharedGroup(input: {
  name: string;
  monthly_target: number;
  target_day_of_month?: number;
  targetDate?: string;
  avatar_url?: string;
  leader: { id: string; name: string; email: string };
  solo?: boolean;
  memberEmails?: string[];
}) {
  const state = await loadState();
  const group: SharedGroup = {
    id: `g_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    name: input.name || "My group",
    invite_code: makeInviteCode(),
    leader_id: input.leader.id,
    monthly_target: input.monthly_target,
    target_day_of_month: input.target_day_of_month,
    avatar_url: input.avatar_url,
    solo: !!input.solo,
  };

  state.groups.unshift(group);
  state.memberships.unshift({
    user_id: input.leader.id,
    user_name: input.leader.name,
    user_email: normalizeEmail(input.leader.email),
    group_id: group.id,
    role: "leader",
    joined_at: iso(),
  });

  for (const email of input.memberEmails ?? []) {
    const recipientEmail = normalizeEmail(email);
    const invitation: SharedInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      group_id: group.id,
      invited_by: input.leader.id,
      invited_email: recipientEmail,
      status: "pending",
      token: group.invite_code,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: iso(),
      updated_at: iso(),
    };
    state.invitations.unshift(invitation);
    state.notifications.unshift(
      buildNotification({
        invitation,
        group,
        senderName: input.leader.name,
        senderId: input.leader.id,
        recipientEmail,
      }),
    );
  }

  await persist(state);
  return { group, memberships: state.memberships.filter((entry) => entry.group_id === group.id) };
}

export async function addSharedExpense(input: { expense: Expense }) {
  const state = await loadState();
  const nextExpense = { ...input.expense };
  const index = state.expenses.findIndex((entry) => entry.id === nextExpense.id);
  if (index >= 0) {
    state.expenses[index] = nextExpense;
  } else {
    state.expenses.unshift(nextExpense);
  }
  if (nextExpense.groupId) {
    const group = state.groups.find((entry) => entry.id === nextExpense.groupId);
    if (group) {
      const actor = state.memberships.find((entry) => entry.group_id === group.id && entry.user_id === nextExpense.paidById);
      const recipients = state.memberships.filter(
        (entry) => entry.group_id === group.id && entry.user_id !== nextExpense.paidById,
      );
      const actorName = actor?.user_name ?? "A group member";
      for (const recipient of recipients) {
        state.notifications.unshift(
          buildExpenseNotification({
            expense: nextExpense,
            group,
            recipient,
            actorName,
            actorId: nextExpense.paidById,
          }),
        );
      }
    }
  }
  await persist(state);
  return nextExpense;
}

export async function getSharedChatMessages(input: { groupId: string }) {
  const state = await loadState();
  return state.messages
    .filter((entry) => entry.groupId === input.groupId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addSharedChatMessage(input: { message: ChatMessage }) {
  const state = await loadState();
  const nextMessage = { ...input.message };
  const index = state.messages.findIndex((entry) => entry.id === nextMessage.id);
  if (index >= 0) {
    state.messages[index] = nextMessage;
  } else {
    state.messages.push(nextMessage);
  }
  await persist(state);
  return nextMessage;
}

export async function getSharedExpenses(input: { groupId: string }) {
  const state = await loadState();
  return state.expenses
    .filter((entry) => entry.groupId === input.groupId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteSharedExpense(input: { expenseId: string }) {
  const state = await loadState();
  state.expenses = state.expenses.filter((entry) => entry.id !== input.expenseId);
  await persist(state);
}

export async function joinSharedGroup(input: {
  inviteCode: string;
  user: { id: string; name: string; email: string };
}) {
  const state = await loadState();
  const nextCode = normalizeInviteCode(input.inviteCode);
  const invitation =
    state.invitations.find((entry) => entry.status === "pending" && normalizeInviteCode(entry.token) === nextCode) ?? null;
  const group = invitation
    ? state.groups.find((entry) => entry.id === invitation.group_id) ?? null
    : state.groups.find((entry) => normalizeInviteCode(entry.invite_code) === nextCode) ?? null;

  if (!group) throw new Error("Invalid invite code. Ask the leader to share it again.");
  if (group.solo) throw new Error("This is a solo fund and does not accept members.");

  const currentEmail = normalizeEmail(input.user.email);
  const alreadyMember = state.memberships.some((entry) => entry.group_id === group.id && entry.user_id === input.user.id);
  if (!alreadyMember) {
    state.memberships.push({
      user_id: input.user.id,
      user_name: input.user.name,
      user_email: currentEmail,
      group_id: group.id,
      role: "member",
      joined_at: iso(),
    });
  }

  if (invitation) {
    invitation.status = "accepted";
    invitation.invited_user_id = input.user.id;
    invitation.updated_at = iso();
  }

  await persist(state);
  return { group, memberships: state.memberships.filter((entry) => entry.group_id === group.id) };
}

export async function inviteUserToGroup(input: {
  groupId: string;
  inviter: { id: string; name: string; email: string };
  invitedEmail: string;
}) {
  const state = await loadState();
  const group = state.groups.find((entry) => entry.id === input.groupId);
  if (!group) throw new Error("Group not found");

  const recipientEmail = normalizeEmail(input.invitedEmail);
  const existing = state.invitations.find(
    (entry) => entry.group_id === group.id && normalizeEmail(entry.invited_email) === recipientEmail && entry.status === "pending",
  );
  if (existing) return existing;

  const invitation: SharedInvitation = {
    id: `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    group_id: group.id,
    invited_by: input.inviter.id,
    invited_email: recipientEmail,
    status: "pending",
    token: group.invite_code,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: iso(),
    updated_at: iso(),
  };

  state.invitations.unshift(invitation);
  state.notifications.unshift(
    buildNotification({
      invitation,
      group,
      senderName: input.inviter.name,
      senderId: input.inviter.id,
      recipientEmail,
    }),
  );
  await persist(state);
  return invitation;
}

export async function getSharedNotifications(input: { userId?: string; email?: string; unreadOnly?: boolean }) {
  const state = await loadState();
  const currentEmail = normalizeEmail(input.email ?? "");
  const visible = state.notifications.filter((entry) => {
    if (input.userId && entry.recipient_id === input.userId) return true;
    if (currentEmail && entry.recipient_email && normalizeEmail(entry.recipient_email) === currentEmail) return true;
    return !entry.recipient_id && !entry.recipient_email;
  });
  return visible
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .filter((entry) => (input.unreadOnly ? !(entry.read || entry.is_read) : true));
}

export async function markSharedNotificationRead(input: { notificationId: string; userId?: string; email?: string }) {
  const state = await loadState();
  const currentEmail = normalizeEmail(input.email ?? "");
  state.notifications = state.notifications.map((entry) => {
    const matchesUser = input.userId ? entry.recipient_id === input.userId : false;
    const matchesEmail = currentEmail ? normalizeEmail(entry.recipient_email ?? "") === currentEmail : false;
    if (entry.id === input.notificationId && (matchesUser || matchesEmail)) {
      return { ...entry, read: true, is_read: true };
    }
    return entry;
  });
  await persist(state);
}

export async function markAllSharedNotificationsRead(input: { userId?: string; email?: string }) {
  const state = await loadState();
  const currentEmail = normalizeEmail(input.email ?? "");
  state.notifications = state.notifications.map((entry) => {
    const matchesUser = input.userId ? entry.recipient_id === input.userId : false;
    const matchesEmail = currentEmail ? normalizeEmail(entry.recipient_email ?? "") === currentEmail : false;
    return matchesUser || matchesEmail ? { ...entry, read: true, is_read: true } : entry;
  });
  await persist(state);
}

export async function acceptSharedInvite(input: { notificationId: string; user: { id: string; name: string; email: string } }) {
  const state = await loadState();
  const note = state.notifications.find((entry) => entry.id === input.notificationId);
  if (!note?.meta || note.meta.kind !== "group_invite") throw new Error("Invite not found.");
  const invitation = state.invitations.find((entry) => entry.id === note.meta?.invitationId);
  const group = state.groups.find((entry) => entry.id === note.meta?.group_id);
  if (!group) throw new Error("Invite group could not be found.");

  const alreadyMember = state.memberships.some((entry) => entry.group_id === group.id && entry.user_id === input.user.id);
  if (!alreadyMember) {
    state.memberships.push({
      user_id: input.user.id,
      user_name: input.user.name,
      user_email: normalizeEmail(input.user.email),
      group_id: group.id,
      role: "member",
      joined_at: iso(),
    });
  }

  if (invitation) {
    invitation.status = "accepted";
    invitation.invited_user_id = input.user.id;
    invitation.updated_at = iso();
  }

  note.read = true;
  note.is_read = true;
  note.meta.status = "accepted";
  note.data = { ...(note.data ?? {}), status: "accepted" };

  if (note.meta.sender_id) {
    const leaderNotification: SharedNotification = {
      id: `n_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      type: "invite_accepted",
      title: `${input.user.name} accepted your invite`,
      body: `${input.user.name} joined ${group.name}.`,
      message: `${input.user.name} joined ${group.name}.`,
      date: iso(),
      created_at: iso(),
      read: false,
      is_read: false,
      recipient_id: note.meta.sender_id,
      data: {
        invitationId: note.meta.invitationId,
        groupId: group.id,
        groupName: group.name,
        inviterName: input.user.name,
        inviteCode: group.invite_code,
        leaderId: input.user.id,
        status: "accepted",
      },
      meta: {
        kind: "group_invite",
        invitationId: note.meta.invitationId,
        group_id: group.id,
        group_name: group.name,
        invite_code: group.invite_code,
        sender_id: input.user.id,
        sender_name: input.user.name,
        status: "accepted",
      },
    };
    state.notifications.unshift(leaderNotification);
  }

  await persist(state);
  return { group, members: state.memberships.filter((entry) => entry.group_id === group.id) };
}

export async function declineSharedInvite(input: { notificationId: string; user: { id: string; name: string; email: string } }) {
  const state = await loadState();
  const note = state.notifications.find((entry) => entry.id === input.notificationId);
  if (!note?.meta || note.meta.kind !== "group_invite") throw new Error("Invite not found.");
  const invitation = state.invitations.find((entry) => entry.id === note.meta?.invitationId);
  const group = state.groups.find((entry) => entry.id === note.meta?.group_id);
  if (!group) throw new Error("Invite group could not be found.");

  if (invitation) {
    invitation.status = "declined";
    invitation.updated_at = iso();
  }
  note.read = true;
  note.is_read = true;
  note.meta.status = "rejected";
  note.data = { ...(note.data ?? {}), status: "declined" };

  if (note.meta.sender_id) {
    state.notifications.unshift({
      id: `n_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      type: "invite_declined",
      title: `${input.user.name} declined your invite`,
      body: `${input.user.name} did not join ${group.name}.`,
      message: `${input.user.name} did not join ${group.name}.`,
      date: iso(),
      created_at: iso(),
      read: false,
      is_read: false,
      recipient_id: note.meta.sender_id,
      data: {
        invitationId: note.meta.invitationId,
        groupId: group.id,
        groupName: group.name,
        inviterName: input.user.name,
        inviteCode: group.invite_code,
        leaderId: input.user.id,
        status: "declined",
      },
      meta: {
        kind: "group_invite",
        invitationId: note.meta.invitationId,
        group_id: group.id,
        group_name: group.name,
        invite_code: group.invite_code,
        sender_id: input.user.id,
        sender_name: input.user.name,
        status: "rejected",
      },
    });
  }

  await persist(state);
}

export async function deleteSharedGroup(input: { groupId: string }) {
  const state = await loadState();
  const group = state.groups.find((entry) => entry.id === input.groupId) ?? null;
  const members = state.memberships.filter((entry) => entry.group_id === input.groupId);
  const actor = state.memberships.find((entry) => entry.group_id === input.groupId && entry.role === "leader") ?? null;

  if (group) {
    const now = iso();
    for (const member of members) {
      state.notifications.push({
        id: crypto.randomUUID(),
        type: "group_deleted",
        title: `Group deleted: ${group.name}`,
        body: `${group.name} was deleted by ${actor?.user_name ?? "the group leader"}.`,
        message: `${group.name} was deleted by ${actor?.user_name ?? "the group leader"}.`,
        date: now,
        created_at: now,
        read: false,
        is_read: false,
        recipient_id: member.user_id,
        recipient_email: member.user_email,
        user_id: member.user_id,
        user_email: member.user_email,
        data: {
          groupId: group.id,
          groupName: group.name,
          leaderId: actor?.user_id ?? group.leader_id,
          leaderName: actor?.user_name,
        },
      });
    }
  }

  state.groups = state.groups.filter((entry) => entry.id !== input.groupId);
  state.memberships = state.memberships.filter((entry) => entry.group_id !== input.groupId);
  state.invitations = state.invitations.filter((entry) => entry.group_id !== input.groupId);
  state.notifications = state.notifications.filter((entry) => {
    const entryGroupId = entry.data?.groupId ?? entry.meta?.group_id;
    if (entry.type === "group_deleted" && entryGroupId === input.groupId) return true;
    return entryGroupId !== input.groupId;
  });
  state.expenses = state.expenses.filter((entry) => entry.groupId !== input.groupId);
  state.messages = state.messages.filter((entry) => entry.groupId !== input.groupId);
  await persist(state);
}

export async function getSharedGroup(input: { groupId: string }) {
  const state = await loadState();
  return state.groups.find((entry) => entry.id === input.groupId) ?? null;
}

export async function getSharedMembers(input: { groupId: string }) {
  const state = await loadState();
  return state.memberships.filter((entry) => entry.group_id === input.groupId);
}

export async function getSharedMyGroups(input: { userId?: string; email?: string }) {
  const state = await loadState();
  const currentEmail = normalizeEmail(input.email ?? "");
  const ids = new Set(
    state.memberships
      .filter((entry) => (input.userId ? entry.user_id === input.userId : false) || (currentEmail ? normalizeEmail(entry.user_email) === currentEmail : false))
      .map((entry) => entry.group_id),
  );
  return state.groups.filter((entry) => ids.has(entry.id));
}
