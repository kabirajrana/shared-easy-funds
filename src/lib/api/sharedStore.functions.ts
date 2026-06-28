import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const userInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
});

const createGroupInput = z.object({
  name: z.string().min(1),
  monthly_target: z.number().finite().nonnegative(),
  target_day_of_month: z.number().int().min(1).max(31).optional(),
  targetDate: z.string().optional(),
  avatar_url: z.string().optional(),
  solo: z.boolean().optional(),
  leader: userInput,
  memberEmails: z.array(z.string().email()).optional(),
});

const joinGroupInput = z.object({
  inviteCode: z.string().min(1),
  user: userInput,
});

const inviteInput = z.object({
  groupId: z.string().min(1),
  inviter: userInput,
  invitedEmail: z.string().email(),
});

const notificationInput = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  unreadOnly: z.boolean().optional(),
});

const notificationActionInput = z.object({
  notificationId: z.string().min(1),
  user: userInput,
});

const groupInput = z.object({
  groupId: z.string().min(1),
});

const memberInput = z.object({
  groupId: z.string().min(1),
});

const myGroupsInput = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
});

const expenseSplitInput = z.object({
  userId: z.string().min(1),
  amount: z.number().finite().nonnegative(),
});

const expenseInput = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  category: z.enum(["food", "transport", "rent", "utilities", "entertainment", "groceries", "shopping", "health", "other"]),
  date: z.string().min(1),
  paidById: z.string().min(1),
  groupId: z.string().optional(),
  splitType: z.enum(["equal", "amount", "percentage"]),
  splits: z.array(expenseSplitInput),
  createdAt: z.string().min(1),
  title: z.string().optional(),
  type: z.enum(["expense", "income"]).optional(),
  notes: z.string().optional(),
});

const chatMessageInput = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  senderColor: z.string().optional(),
  senderInitials: z.string().optional(),
  kind: z.enum(["text", "image", "voice", "file"]),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaName: z.string().optional(),
  mediaType: z.string().optional(),
  durationMs: z.number().finite().nonnegative().optional(),
  createdAt: z.string().min(1),
});

async function store() {
  return import("../server/sharedStore.server");
}

export const createSharedGroupFn = createServerFn({ method: "POST" })
  .validator(createGroupInput)
  .handler(async ({ data }) => {
    const { createSharedGroup } = await store();
    return createSharedGroup(data);
  });

export const joinSharedGroupFn = createServerFn({ method: "POST" })
  .validator(joinGroupInput)
  .handler(async ({ data }) => {
    const { joinSharedGroup } = await store();
    return joinSharedGroup(data);
  });

export const inviteUserToGroupFn = createServerFn({ method: "POST" })
  .validator(inviteInput)
  .handler(async ({ data }) => {
    const { inviteUserToGroup } = await store();
    return inviteUserToGroup(data);
  });

export const getSharedNotificationsFn = createServerFn({ method: "POST" })
  .validator(notificationInput)
  .handler(async ({ data }) => {
    const { getSharedNotifications } = await store();
    return getSharedNotifications(data);
  });

export const markSharedNotificationReadFn = createServerFn({ method: "POST" })
  .validator(notificationActionInput)
  .handler(async ({ data }) => {
    const { markSharedNotificationRead } = await store();
    await markSharedNotificationRead({ notificationId: data.notificationId, userId: data.user.id, email: data.user.email });
    return { success: true as const };
  });

export const markAllSharedNotificationsReadFn = createServerFn({ method: "POST" })
  .validator(userInput)
  .handler(async ({ data }) => {
    const { markAllSharedNotificationsRead } = await store();
    await markAllSharedNotificationsRead({ userId: data.id, email: data.email });
    return { success: true as const };
  });

export const acceptSharedInviteFn = createServerFn({ method: "POST" })
  .validator(notificationActionInput)
  .handler(async ({ data }) => {
    const { acceptSharedInvite } = await store();
    return acceptSharedInvite({ notificationId: data.notificationId, user: data.user });
  });

export const declineSharedInviteFn = createServerFn({ method: "POST" })
  .validator(notificationActionInput)
  .handler(async ({ data }) => {
    const { declineSharedInvite } = await store();
    await declineSharedInvite({ notificationId: data.notificationId, user: data.user });
    return { success: true as const };
  });

export const getSharedGroupFn = createServerFn({ method: "POST" })
  .validator(groupInput)
  .handler(async ({ data }) => {
    const { getSharedGroup } = await store();
    return getSharedGroup(data);
  });

export const getSharedMembersFn = createServerFn({ method: "POST" })
  .validator(memberInput)
  .handler(async ({ data }) => {
    const { getSharedMembers } = await store();
    return getSharedMembers(data);
  });

export const getSharedMyGroupsFn = createServerFn({ method: "POST" })
  .validator(myGroupsInput)
  .handler(async ({ data }) => {
    const { getSharedMyGroups } = await store();
    return getSharedMyGroups(data);
  });

export const deleteSharedGroupFn = createServerFn({ method: "POST" })
  .validator(groupInput)
  .handler(async ({ data }) => {
    const { deleteSharedGroup } = await store();
    await deleteSharedGroup(data);
    return { success: true as const };
  });

export const addSharedExpenseFn = createServerFn({ method: "POST" })
  .validator(z.object({ expense: expenseInput }))
  .handler(async ({ data }) => {
    const { addSharedExpense } = await store();
    return addSharedExpense({ expense: data.expense });
  });

export const getSharedExpensesFn = createServerFn({ method: "POST" })
  .validator(groupInput)
  .handler(async ({ data }) => {
    const { getSharedExpenses } = await store();
    return getSharedExpenses(data);
  });

export const deleteSharedExpenseFn = createServerFn({ method: "POST" })
  .validator(z.object({ expenseId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { deleteSharedExpense } = await store();
    await deleteSharedExpense(data);
    return { success: true as const };
  });

export const getSharedChatMessagesFn = createServerFn({ method: "POST" })
  .validator(groupInput)
  .handler(async ({ data }) => {
    const { getSharedChatMessages } = await store();
    return getSharedChatMessages(data);
  });

export const addSharedChatMessageFn = createServerFn({ method: "POST" })
  .validator(z.object({ message: chatMessageInput }))
  .handler(async ({ data }) => {
    const { addSharedChatMessage } = await store();
    return addSharedChatMessage({ message: data.message });
  });
