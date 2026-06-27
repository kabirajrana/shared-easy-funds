import { create } from "zustand";
import { generateInviteCode } from "@/utils/inviteCode";
import type { Group, User } from "@/types";
import { useUserStore } from "@/store/useUserStore";

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
  joinGroup: (inviteCode: string) => Group | undefined;
};

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

    return {
      groups: rawGroups ? (JSON.parse(rawGroups) as Group[]) : [],
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
    const owner = leader ?? useUserStore.getState().currentUser;
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
  joinGroup: (inviteCode) => {
    const nextCode = inviteCode.trim().toUpperCase();
    const group = get().groups.find((entry) => entry.inviteCode === nextCode);
    if (!group) return undefined;

    const currentUser = useUserStore.getState().currentUser;

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
