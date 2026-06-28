import { create } from "zustand";
import { generateInviteCode } from "@/utils/inviteCode";
import type { Group, User } from "@/types";
import { api } from "@/services/api";
import { useUserStore } from "@/store/useUserStore";

const GROUPS_PREFIX = "sajha.groups";
const MEMBERS_PREFIX = "sajha.groupMembers";
const ACTIVE_PREFIX = "sajha.activeGroup";

type GroupState = {
  groups: Group[];
  groupMembers: Record<string, User[]>;
  activeGroupId: string;
  hydrateWorkspace: () => Promise<void>;
  upsertSharedGroup: (group: {
    id: string;
    name: string;
    invite_code: string;
    leader_id: string;
    monthly_target: number;
    target_day_of_month?: number;
    target_date?: string;
    qr_image_url?: string;
    qr_label?: string;
    avatar_url?: string;
    avatar_color?: string;
    solo?: boolean;
    targetDate?: string;
    avatarImage?: string;
    avatarColor?: string;
  }) => Group;
  resetWorkspace: () => void;
  deleteGroup: (groupId: string) => void;
  createGroup: (input: {
    name: string;
    avatarColor: string;
    avatarImage?: string;
    targetBudget?: number;
    targetDayOfMonth?: number;
    targetDate?: string;
    memberEmails: string[];
    paymentQR?: Group["paymentQR"];
    leader?: User;
  }) => Group;
  joinGroup: (inviteCode: string) => Group | undefined;
  addMember: (groupId: string, email: string) => void;
  generateInviteCode: () => string;
  setActiveGroupId: (groupId: string) => void;
  updateGroup: (groupId: string, patch: Partial<Group>) => void;
};

function normalizeGroup(raw: any): Group | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.inviteCode === "string") return raw as Group;
  if (typeof raw.invite_code !== "string") return null;

  return {
    id: String(raw.id),
    name: String(raw.name ?? "My group"),
    avatarColor: String(raw.avatarColor ?? raw.avatar_color ?? "#1A6B5A"),
    avatarImage: raw.avatarImage ?? raw.avatar_url,
    inviteCode: String(raw.invite_code),
    leaderId: String(raw.leaderId ?? raw.leader_id ?? ""),
    memberIds: Array.isArray(raw.memberIds) ? raw.memberIds.map(String) : [],
    targetBudget:
      typeof raw.targetBudget === "number"
        ? raw.targetBudget
        : typeof raw.monthly_target === "number"
          ? raw.monthly_target
          : raw.target_budget,
    targetDayOfMonth: raw.targetDayOfMonth ?? raw.target_day_of_month,
    targetDate: raw.targetDate ?? raw.target_date,
    paymentQR: raw.paymentQR
      ? raw.paymentQR
      : raw.qr_image_url || raw.qr_label
        ? {
            provider: "eSewa",
            name: String(raw.qr_label ?? raw.name ?? "Group wallet"),
            qrImage: raw.qr_image_url,
          }
        : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString().slice(0, 10)),
    memberCount: raw.memberCount ?? raw.member_count ?? undefined,
    lastUpdated: raw.lastUpdated ?? raw.last_updated ?? undefined,
    statusText: raw.statusText ?? raw.status_text ?? undefined,
    balance: raw.balance ?? 0,
  };
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

function loadWorkspace() {
  if (typeof window === "undefined") {
    return {
      groups: [],
      groupMembers: {},
      activeGroupId: "",
    };
  }

  try {
    const rawGroups = localStorage.getItem(GROUPS_PREFIX);
    const rawMembers = localStorage.getItem(MEMBERS_PREFIX);
    const rawActive = localStorage.getItem(ACTIVE_PREFIX);
    const groups = rawGroups ? (JSON.parse(rawGroups) as unknown[]) : [];

    return {
      groups: groups.map(normalizeGroup).filter(Boolean) as Group[],
      groupMembers: rawMembers ? (JSON.parse(rawMembers) as Record<string, User[]>) : {},
      activeGroupId: rawActive ?? "",
    };
  } catch {
    return {
      groups: [],
      groupMembers: {},
      activeGroupId: "",
    };
  }
}

function persistWorkspace(state: Pick<GroupState, "groups" | "groupMembers" | "activeGroupId">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GROUPS_PREFIX, JSON.stringify(state.groups));
    localStorage.setItem(MEMBERS_PREFIX, JSON.stringify(state.groupMembers));
    localStorage.setItem(ACTIVE_PREFIX, state.activeGroupId);
  } catch {}
}

function normalizeMember(raw: any): User | null {
  const user = raw?.user ?? raw;
  if (!user || typeof user !== "object") return null;
  if (typeof user.id !== "string" || typeof user.name !== "string" || typeof user.email !== "string") return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarColor: typeof user.avatarColor === "string" ? user.avatarColor : typeof user.avatar_color === "string" ? user.avatar_color : "#888780",
    avatarImage: typeof user.avatarImage === "string" ? user.avatarImage : typeof user.avatar_url === "string" ? user.avatar_url : undefined,
    paymentQR: user.paymentQR,
    monthlyBudget: typeof user.monthlyBudget === "number" ? user.monthlyBudget : 25000,
    phone: typeof user.phone === "string" ? user.phone : undefined,
    initials: typeof user.initials === "string" ? user.initials : user.name.slice(0, 2).toUpperCase(),
  };
}

function mergeGroups(localGroups: Group[], serverGroups: Group[]) {
  if (serverGroups.length === 0) return localGroups;

  const serverIds = new Set(serverGroups.map((group) => group.id));
  const preservedLocalGroups = localGroups.filter((group) => !serverIds.has(group.id));
  return [...serverGroups, ...preservedLocalGroups];
}

function mergeMembers(
  localMembers: Record<string, User[]>,
  serverMembers: Record<string, User[]>,
) {
  const next: Record<string, User[]> = { ...localMembers };
  for (const [groupId, members] of Object.entries(serverMembers)) {
    if (members.length === 0 && (localMembers[groupId]?.length ?? 0) > 0) continue;
    next[groupId] = members.length > 0 ? members : localMembers[groupId] ?? [];
  }
  return next;
}

let syncReady = false;

function setupSync(refresh: () => Promise<void>) {
  if (typeof window === "undefined" || syncReady) return;
  syncReady = true;

  const runRefresh = () => {
    void refresh();
  };

  window.addEventListener("focus", runRefresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") runRefresh();
  });
  window.setInterval(runRefresh, 5000);
}

export const useGroupStore = create<GroupState>((set, get) => ({
  ...loadWorkspace(),
  hydrateWorkspace: async () => {
    try {
      const local = loadWorkspace();
      const serverGroups = await api.myGroups();
      const nextGroups = serverGroups.map(normalizeGroup).filter(Boolean) as Group[];

      const nextMembers = Object.fromEntries(
        await Promise.all(
          nextGroups.map(async (group) => {
            try {
              const members = await api.getMembers(group.id);
              return [group.id, members.map(normalizeMember).filter(Boolean) as User[]] as const;
            } catch {
              return [group.id, []] as const;
            }
          }),
        ),
      );

      set((state) => {
        const mergedGroups = mergeGroups(local.groups, nextGroups);
        const mergedMembers = mergeMembers(local.groupMembers, nextMembers);
        const activeGroupId =
          state.activeGroupId && mergedGroups.some((group) => group.id === state.activeGroupId)
            ? state.activeGroupId
            : local.activeGroupId && mergedGroups.some((group) => group.id === local.activeGroupId)
              ? local.activeGroupId
              : "";
        const next = {
          groups: mergedGroups,
          groupMembers: mergedMembers,
          activeGroupId,
        };
        persistWorkspace(next);
        return next;
      });
      return;
    } catch {
      set(() => loadWorkspace());
    }
  },
  upsertSharedGroup: (group) => {
    const existing = get().groups.find((entry) => entry.id === group.id);
    const nextGroup: Group = {
      id: group.id,
      name: group.name,
      avatarColor: group.avatarColor ?? group.avatar_color ?? existing?.avatarColor ?? "#1A6B5A",
      avatarImage: group.avatarImage ?? existing?.avatarImage ?? group.avatar_url,
      inviteCode: group.invite_code,
      leaderId: group.leader_id,
      memberIds: existing?.memberIds ?? [],
      targetBudget: group.monthly_target,
      targetDayOfMonth: group.target_day_of_month,
      targetDate: group.targetDate ?? group.target_date ?? existing?.targetDate,
      paymentQR: group.qr_image_url || group.qr_label
        ? {
            provider: "eSewa",
            name: String(group.qr_label ?? group.name),
            qrImage: group.qr_image_url,
          }
        : existing?.paymentQR,
      createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
      memberCount: existing?.memberCount,
      lastUpdated: new Date().toISOString().slice(0, 10),
      statusText: existing?.statusText,
      balance: existing?.balance ?? 0,
    };

    set((state) => {
      const next = {
        ...state,
        groups: state.groups.some((entry) => entry.id === group.id)
          ? state.groups.map((entry) => (entry.id === group.id ? { ...entry, ...nextGroup } : entry))
          : [nextGroup, ...state.groups],
      };
      persistWorkspace(next);
      return next;
    });
    return nextGroup;
  },
  generateInviteCode,
  resetWorkspace: () =>
    set(() => {
      const next = { groups: [], groupMembers: {}, activeGroupId: "" };
      persistWorkspace(next);
      return next;
    }),
  deleteGroup: (groupId) =>
    set((state) => {
      const next = {
        groups: state.groups.filter((group) => group.id !== groupId),
        groupMembers: Object.fromEntries(
          Object.entries(state.groupMembers).filter(([key]) => key !== groupId),
        ),
        activeGroupId: state.activeGroupId === groupId ? "" : state.activeGroupId,
      };
      persistWorkspace(next);
      return next;
    }),
  setActiveGroupId: (groupId) =>
    set((state) => {
      const next = { ...state, activeGroupId: groupId };
      persistWorkspace(next);
      return { activeGroupId: groupId };
    }),
  updateGroup: (groupId, patch) =>
    set((state) => {
      const next = {
        ...state,
        groups: state.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
      };
      persistWorkspace(next);
      return next;
    }),
  createGroup: ({
    name,
    avatarColor,
    avatarImage,
    targetBudget,
    targetDayOfMonth,
    targetDate,
    memberEmails,
    paymentQR,
    leader,
  }) => {
    const current = loadWorkspace();
    const owner = leader ?? useUserStore.getState().currentUser;
    if (!owner?.id) {
      throw new Error("Please sign in before creating a group.");
    }
    const group: Group = {
      id: crypto.randomUUID(),
      name,
      avatarColor,
      avatarImage,
      inviteCode: generateInviteCode(),
      leaderId: owner.id,
      memberIds: [owner.id, ...memberEmails.map((email) => email.toLowerCase())],
      targetBudget,
      targetDayOfMonth,
      targetDate,
      paymentQR,
      createdAt: new Date().toISOString().slice(0, 10),
      memberCount: memberEmails.length + 1,
      lastUpdated: new Date().toISOString().slice(0, 10),
      statusText: "Settled up",
      balance: 0,
    };

    set(() => {
      const next = {
        groups: [group, ...current.groups],
        groupMembers: {
        ...current.groupMembers,
        [group.id]: [
          owner,
          ...memberEmails.map((email, index) => ({
            id: email.toLowerCase(),
            name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
            email,
            avatarColor: ["#1A6B5A", "#534AB7", "#BA7517", "#E24B4A", "#185FA5", "#888780"][index % 6],
            monthlyBudget: 25000,
            initials: email.slice(0, 2).toUpperCase(),
          })),
        ],
        },
        activeGroupId: group.id,
      };
      persistWorkspace(next);
      return next;
    });

    return group;
  },
  joinGroup: (inviteCode) => {
    const nextCode = normalizeInviteCode(inviteCode);
    const current = loadWorkspace();
    set(() => current);
    const group = current.groups.find((entry) => normalizeInviteCode(entry.inviteCode) === nextCode);
    if (!group) return undefined;

    const currentUser = useUserStore.getState().currentUser;
    if (!currentUser?.id) {
      throw new Error("Please sign in before joining a group.");
    }

    set((state) => {
      const members = state.groupMembers[group.id] ?? [];
      const nextMembers = members.some((member) => member.id === currentUser.id) ? members : [...members, currentUser];
      const next = {
        ...state,
        groupMembers: {
          ...state.groupMembers,
          [group.id]: nextMembers,
        },
        groups: state.groups.map((entry) =>
          entry.id === group.id
            ? {
                ...entry,
                memberIds: entry.memberIds.includes(currentUser.id) ? entry.memberIds : [...entry.memberIds, currentUser.id],
                memberCount: nextMembers.length,
                lastUpdated: new Date().toISOString().slice(0, 10),
              }
            : entry,
        ),
        activeGroupId: group.id,
      };
      persistWorkspace(next);
      return next;
    });

    return group;
  },
  addMember: (groupId, email) =>
    set((state) => {
      const member: User = {
        id: email.toLowerCase(),
        name: email.split("@")[0],
        email,
        avatarColor: "#888780",
        monthlyBudget: 25000,
        initials: email.slice(0, 2).toUpperCase(),
      };

      const next = {
        groupMembers: {
          ...state.groupMembers,
          [groupId]: [...(state.groupMembers[groupId] ?? []), member],
        },
        groups: state.groups.map((group) =>
          group.id === groupId
            ? {
                ...group,
                memberIds: [...group.memberIds, member.id],
                memberCount: (group.memberCount ?? group.memberIds.length) + 1,
                lastUpdated: new Date().toISOString().slice(0, 10),
              }
            : group,
        ),
      };
      persistWorkspace(next);
      return next;
    }),
}));

setupSync(() => useGroupStore.getState().hydrateWorkspace());
