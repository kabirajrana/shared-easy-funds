import { create } from "zustand";
import { generateInviteCode } from "@/utils/inviteCode";
import type { Group, User } from "@/types";
import { demoGroups, demoUsers } from "@/store/seed";

type GroupState = {
  groups: Group[];
  groupMembers: Record<string, User[]>;
  activeGroupId: string;
  createGroup: (input: {
    name: string;
    avatarColor: string;
    targetDayOfMonth?: number;
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

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: demoGroups,
  groupMembers: seedMembers,
  activeGroupId: demoGroups[0].id,
  generateInviteCode,
  setActiveGroupId: (groupId) => set({ activeGroupId: groupId }),
  updateGroup: (groupId, patch) =>
    set((state) => ({
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
    })),
  createGroup: ({ name, avatarColor, targetDayOfMonth, memberEmails, paymentQR, leader }) => {
    const owner = leader ?? demoUsers[0];
    const group: Group = {
      id: crypto.randomUUID(),
      name,
      avatarColor,
      inviteCode: generateInviteCode(),
      leaderId: owner.id,
      memberIds: [owner.id, ...memberEmails.map((email) => email.toLowerCase())],
      targetDayOfMonth,
      paymentQR,
      createdAt: new Date().toISOString().slice(0, 10),
      memberCount: memberEmails.length + 1,
      lastUpdated: new Date().toISOString().slice(0, 10),
      statusText: "Settled up",
      balance: 0,
    };

    set((state) => ({
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
    }));

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

      return {
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
    }),
}));
