import { create } from "zustand";
import type { ChatMessage, User } from "@/types";

const CHATS_KEY = "sajha.groupChats";
const CHANNEL_NAME = "sajha:group-chat";

type ChatState = {
  messages: ChatMessage[];
  hydrateWorkspace: () => void;
  resetWorkspace: () => void;
  getGroupMessages: (groupId: string) => ChatMessage[];
  sendMessage: (input: {
    groupId: string;
    sender: User;
    text?: string;
    kind?: ChatMessage["kind"];
    mediaUrl?: string;
    mediaName?: string;
    mediaType?: string;
    durationMs?: number;
  }) => ChatMessage;
};

let syncReady = false;
let channel: BroadcastChannel | null = null;

function normalizeMessage(raw: any): ChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.groupId !== "string" || typeof raw.senderId !== "string") return null;

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    groupId: raw.groupId,
    senderId: raw.senderId,
    senderName: String(raw.senderName ?? "Member"),
    senderColor: typeof raw.senderColor === "string" ? raw.senderColor : undefined,
    senderInitials: typeof raw.senderInitials === "string" ? raw.senderInitials : undefined,
    kind: raw.kind === "image" || raw.kind === "voice" || raw.kind === "file" ? raw.kind : "text",
    text: typeof raw.text === "string" ? raw.text : undefined,
    mediaUrl: typeof raw.mediaUrl === "string" ? raw.mediaUrl : typeof raw.media_url === "string" ? raw.media_url : undefined,
    mediaName: typeof raw.mediaName === "string" ? raw.mediaName : typeof raw.media_name === "string" ? raw.media_name : undefined,
    mediaType: typeof raw.mediaType === "string" ? raw.mediaType : typeof raw.media_type === "string" ? raw.media_type : undefined,
    durationMs:
      typeof raw.durationMs === "number"
        ? raw.durationMs
        : typeof raw.duration_ms === "number"
          ? raw.duration_ms
          : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function loadMessages() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    return parsed.map(normalizeMessage).filter(Boolean) as ChatMessage[];
  } catch {
    return [];
  }
}

function persistMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(messages));
  } catch {}
}

function publishUpdate() {
  channel?.postMessage({ type: "chat:updated" });
}

function setupSync(onChange: () => void) {
  if (typeof window === "undefined" || syncReady) return;
  syncReady = true;

  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === "chat:updated") onChange();
    };
  }

  window.addEventListener("storage", (event) => {
    if (event.key === CHATS_KEY) onChange();
  });
}

export const useChatStore = create<ChatState>((set, get) => {
  const refresh = () =>
    set(() => ({
      messages: loadMessages(),
    }));

  setupSync(refresh);

  return {
    messages: loadMessages(),
    hydrateWorkspace: refresh,
    resetWorkspace: () =>
      set(() => {
        persistMessages([]);
        publishUpdate();
        return { messages: [] };
      }),
    getGroupMessages: (groupId) =>
      get()
        .messages.filter((message) => message.groupId === groupId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    sendMessage: ({ groupId, sender, text, kind, mediaUrl, mediaName, mediaType, durationMs }) => {
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        groupId,
        senderId: sender.id,
        senderName: sender.name,
        senderColor: sender.avatarColor,
        senderInitials: sender.initials,
        kind: kind ?? "text",
        text: typeof text === "string" ? text.trim() : undefined,
        mediaUrl,
        mediaName,
        mediaType,
        durationMs,
        createdAt: new Date().toISOString(),
      };

      set((state) => {
        const nextMessages = [...state.messages, message];
        persistMessages(nextMessages);
        publishUpdate();
        return { messages: nextMessages };
      });

      return message;
    },
  };
});
