import { create } from "zustand";
import { generateInviteCode } from "@/utils/inviteCode";
import type { Group, User } from "@/types";
import { demoGroups, demoUsers } from "@/store/seed";

const LS_CURRENT_USER = "sajha.currentUser";
const GROUPS_PREFIX = "sajha.groups";
const MEMBERS_PREFIX = "sajha.groupMembers";
const ACTIVE_PREFIX = "sajha.activeGroup";

type GroupState = {
  groups: Group[];
  groupMembers: Record<string, User[]>;
  activeGroupId: string;
  hydrateWorkspace: () => void;
  resetWorkspace: () => void;
  createGroup: (input: {
    name: string;
    avatarColor: string;
    avatarImage?: string;
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

const seedMembers: Record<string, User[]> = {
  "g-flat4b": demoUsers.slice(0, 4),
  "g-dashain": demoUsers.slice(0, 6),
  "g-pokhara": [demoUsers[0], demoUsers[2], demoUsers[3], demoUsers[4]],
};

function getCurrentUserId() {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(LS_CURRENT_USER);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { id?: string } | null;
    return parsed?.id ?? "";
  } catch {
    return "";
  }
}

function storageKey(prefix: string, userId: string) {
  return `${prefix}:${userId || "guest"}`;
}

function loadWorkspace() {
  if (typeof window === "undefined") {
    return {
      groups: demoGroups,
      groupMembers: seedMembers,
      activeGroupId: demoGroups[0]?.id ?? "",
    };
  }

  const userId = getCurrentUserId();
  const allowDemoSeed = userId === demoUsers[0].id;

  try {
    const rawGroups = localStorage.getItem(storageKey(GROUPS_PREFIX, userId));
    const rawMembers = localStorage.getItem(storageKey(MEMBERS_PREFIX, userId));
    const rawActive = localStorage.getItem(storageKey(ACTIVE_PREFIX, userId));

    return {
      groups: rawGroups ? (JSON.parse(rawGroups) as Group[]) : allowDemoSeed ? demoGroups : [],
      groupMembers: rawMembers ? (JSON.parse(rawMembers) as Record<string, User[]>) : allowDemoSeed ? seedMembers : {},
      activeGroupId: rawActive ?? (allowDemoSeed ? demoGroups[0]?.id ?? "" : ""),
    };
  } catch {
    return {
      groups: allowDemoSeed ? demoGroups : [],
      groupMembers: allowDemoSeed ? seedMembers : {},
      activeGroupId: allowDemoSeed ? demoGroups[0]?.id ?? "" : "",
    };
  }
}

function persistWorkspace(state: Pick<GroupState, "groups" | "groupMembers" | "activeGroupId">) {
  if (typeof window === "undefined") return;
  const userId = getCurrentUserId();
  try {
    localStorage.setItem(storageKey(GROUPS_PREFIX, userId), JSON.stringify(state.groups));
    localStorage.setItem(storageKey(MEMBERS_PREFIX, userId), JSON.stringify(state.groupMembers));
    localStorage.setItem(storageKey(ACTIVE_PREFIX, userId), state.activeGroupId);
  } catch {}
}

export const useGroupStore = create<GroupState>((set, get) => ({
  ...loadWorkspace(),
  hydrateWorkspace: () =>
    set(() => {
      const next = loadWorkspace();
      return next;
    }),
  generateInviteCode,
  resetWorkspace: () =>
    set(() => {
      const next = { groups: [], groupMembers: {}, activeGroupId: "" };
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
  createGroup: ({ name, avatarColor, avatarImage, targetDayOfMonth, targetDate, memberEmails, paymentQR, leader }) => {
    const owner = leader ?? demoUsers[0];
    const group: Group = {
      id: crypto.randomUUID(),
      name,
      avatarColor,
      avatarImage,
      inviteCode: generateInviteCode(),
      leaderId: owner.id,
      memberIds: [owner.id, ...memberEmails.map((email) => email.toLowerCase())],
      targetDayOfMonth,
      targetDate,
      paymentQR,
      createdAt: new Date().toISOString().slice(0, 10),
      memberCount: memberEmails.length + 1,
      lastUpdated: new Date().toISOString().slice(0, 10),
      statusText: "Settled up",
      balance: 0,
    };

    set((state) => {
      const next = {
        groups: [group, ...state.groups],
        groupMembers: {
        ...state.groupMembers,
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
  joinGroup: (inviteCode) => get().groups.find((group) => group.inviteCode === inviteCode),
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
