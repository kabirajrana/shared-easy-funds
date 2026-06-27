import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  FileText,
  Image as GalleryIcon,
  MessageCircleMore,
  Mic,
  MoreVertical,
  Plus,
  Phone,
  Smile,
  SendHorizonal,
  Square,
  Upload,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useChatStore } from "@/store/useChatStore";
import { useGroupStore } from "@/store/useGroupStore";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { ChatMessage, User } from "@/types";

type PendingAttachment =
  | {
      kind: "image";
      mediaUrl: string;
      mediaName: string;
      mediaType: string;
    }
  | {
      kind: "file";
      mediaUrl: string;
      mediaName: string;
      mediaType: string;
    }
  | {
      kind: "voice";
      mediaUrl: string;
      mediaName: string;
      mediaType: string;
      durationMs: number;
    };

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(ms?: number) {
  if (!ms || !Number.isFinite(ms)) return "";
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ sender }: { sender: Pick<User, "name" | "avatarColor" | "initials"> }) {
  return (
    <div
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white shadow-sm ring-2 ring-[#0b1117]"
      style={{ background: sender.avatarColor || "var(--saj-green)" }}
    >
      {sender.initials ?? getInitials(sender.name)}
    </div>
  );
}

function dataUrlFromFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function dataUrlFromBlob(blob: Blob) {
  return dataUrlFromFile(new File([blob], "voice-note.webm", { type: blob.type || "audio/webm" }));
}

function fileKindFromMime(mime: string): PendingAttachment["kind"] {
  return mime.startsWith("image/") ? "image" : "file";
}

export function GroupChatPanel({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { user } = useSession();
  const group = useGroupStore((state) => state.groups.find((entry) => entry.id === groupId));
  const groupMembers = useGroupStore((state) => state.groupMembers);
  const messages = useChatStore((state) => state.messages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const hydrateWorkspace = useChatStore((state) => state.hydrateWorkspace);
  const [draft, setDraft] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStartedAtRef = useRef<number>(0);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);

  const members = group ? groupMembers[group.id] ?? [] : [];
  const groupMessages = useMemo(
    () => messages.filter((message) => message.groupId === groupId),
    [messages, groupId],
  );

  useEffect(() => {
    hydrateWorkspace();
  }, [hydrateWorkspace]);

  useEffect(() => {
    const scroller = listRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [groupMessages.length]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setRecordSeconds(Math.max(0, Math.floor((Date.now() - recordStartedAtRef.current) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const closeAttachment = () => setPendingAttachment(null);

  const handleSend = () => {
    if (!user) {
      toast.error("Please sign in to chat.");
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed && !pendingAttachment) return;

    if (pendingAttachment) {
      sendMessage({
        groupId,
        sender: user,
        kind: pendingAttachment.kind,
        text: trimmed || undefined,
        mediaUrl: pendingAttachment.mediaUrl,
        mediaName: pendingAttachment.mediaName,
        mediaType: pendingAttachment.mediaType,
        durationMs: pendingAttachment.kind === "voice" ? pendingAttachment.durationMs : undefined,
      });
      setPendingAttachment(null);
      setDraft("");
      return;
    }

    sendMessage({ groupId, sender: user, text: trimmed, kind: "text" });
    setDraft("");
  };

  const handleQuickSend = () => {
    if (draft.trim() || pendingAttachment) {
      handleSend();
      return;
    }

    if (!user) {
      toast.error("Please sign in to chat.");
      return;
    }

    sendMessage({ groupId, sender: user, text: "👍", kind: "text" });
  };

  const handlePickImage = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    try {
      const mediaUrl = await dataUrlFromFile(file);
      setPendingAttachment({
        kind: "image",
        mediaUrl,
        mediaName: file.name,
        mediaType: file.type,
      });
    } catch {
      toast.error("Could not attach the image.");
    }
  };

  const handlePickFile = async (file: File | null) => {
    if (!file) return;
    try {
      const mediaUrl = await dataUrlFromFile(file);
      setPendingAttachment({
        kind: fileKindFromMime(file.type),
        mediaUrl,
        mediaName: file.name,
        mediaType: file.type || "application/octet-stream",
      });
    } catch {
      toast.error("Could not attach the file.");
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice notes are not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordedChunksRef.current = [];
      recordStartedAtRef.current = Date.now();
      setRecordSeconds(0);
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const durationMs = Date.now() - recordStartedAtRef.current;
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const mediaUrl = await dataUrlFromBlob(blob);
        setPendingAttachment({
          kind: "voice",
          mediaUrl,
          mediaName: `Voice note ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
          mediaType: blob.type || "audio/webm",
          durationMs,
        });
        setIsRecording(false);
        setRecordSeconds(0);
        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      };

      recorder.start();
    } catch {
      setIsRecording(false);
      toast.error("Microphone access was denied.");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
  };

  return (
    <section className="flex min-h-dvh flex-col bg-[#0b1117] text-white">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#111826]/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/85 transition hover:bg-white/10"
            aria-label="Back to group"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1C7E5D] text-sm font-semibold text-white ring-2 ring-[#111826]">
                {getInitials(groupName)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[#111826] bg-[#0EA06F]" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold text-white">{groupName}</h1>
              <p className="text-[12px] text-white/50">
                {members.length > 0 ? `${members.length} members` : "Live chat"}
                {group?.leaderId ? " · active now" : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/85 transition hover:bg-white/10"
            aria-label="Call"
            onClick={() => toast.message("Calling is not wired yet")}
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/85 transition hover:bg-white/10"
            aria-label="More"
            onClick={() => toast.message("More actions coming soon")}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(30,64,175,0.18),transparent_36%),linear-gradient(180deg,#0b1117,#0b1117)] px-4 py-4">
        <div ref={listRef} className="space-y-3">
          {groupMessages.length > 0 ? (
            groupMessages.map((message) => {
              const isMine = message.senderId === user?.id;
              return (
                <div key={message.id} className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}>
                  {!isMine ? (
                    <Avatar
                      sender={{
                        name: message.senderName,
                        avatarColor: message.senderColor ?? "var(--saj-green)",
                        initials: message.senderInitials,
                      }}
                    />
                  ) : (
                    <div className="w-8" />
                  )}

                  <div className={cn("max-w-[82%]", isMine ? "items-end" : "items-start")}>
                    {!isMine ? (
                      <p className="mb-1 ml-2 text-[11px] text-white/40">{message.senderName}</p>
                    ) : null}
                    <div
                      className={cn(
                        "rounded-[22px] px-4 py-3 shadow-[0_8px_18px_rgba(0,0,0,0.18)]",
                        isMine
                          ? "rounded-br-[10px] bg-[#0A7C53] text-white"
                          : "rounded-bl-[10px] bg-[#1B2533] text-white",
                      )}
                    >
                      <MessageContent message={message} />
                    </div>
                    <div className={cn("mt-1 flex items-center gap-1 px-2 text-[10px]", isMine ? "justify-end text-white/45" : "text-white/35")}>
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {isMine ? <span>✓✓</span> : null}
                    </div>
                  </div>

                  {isMine ? (
                    <Avatar
                      sender={{
                        name: message.senderName,
                        avatarColor: message.senderColor ?? "var(--saj-green)",
                        initials: message.senderInitials,
                      }}
                    />
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="grid min-h-[55dvh] place-items-center rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center text-white/80">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-[#17311f] text-[#49d18f]">
                <MessageCircleMore className="h-7 w-7" />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-white">Start the conversation</p>
              <p className="mt-1 max-w-xs text-[12px] leading-5 text-white/50">
                Share a photo, voice note, file, or just say hi. The chat updates live across open tabs.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 bg-[#0f1520] px-3 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {pendingAttachment ? (
          <div className="mb-3 rounded-[18px] border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Attachment preview</p>
                <p className="truncate text-[13px] font-medium text-white">
                  {pendingAttachment.kind === "voice"
                    ? `${pendingAttachment.mediaName} · ${formatDuration(pendingAttachment.durationMs)}`
                    : pendingAttachment.mediaName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAttachment}
                className="grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/10"
                aria-label="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pendingAttachment.kind === "image" ? (
              <div className="overflow-hidden rounded-[16px] border border-white/10 bg-black/20">
                <img src={pendingAttachment.mediaUrl} alt={pendingAttachment.mediaName} className="max-h-56 w-full object-cover" />
              </div>
            ) : pendingAttachment.kind === "voice" ? (
              <div className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-black/20 px-3 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0A7C53] text-white">
                  <Mic className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white">Voice note ready</p>
                  <p className="text-[12px] text-white/45">{formatDuration(pendingAttachment.durationMs)}</p>
                </div>
                <audio controls className="w-[180px] max-w-full">
                  <source src={pendingAttachment.mediaUrl} type={pendingAttachment.mediaType} />
                </audio>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-black/20 px-3 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#17311f] text-[#49d18f]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white">{pendingAttachment.mediaName}</p>
                  <p className="text-[12px] text-white/45">{pendingAttachment.mediaType || "File"}</p>
                </div>
                <a
                  href={pendingAttachment.mediaUrl}
                  download={pendingAttachment.mediaName}
                  className="rounded-full border border-white/10 px-3 py-1 text-[12px] font-medium text-white/80"
                >
                  Download
                </a>
              </div>
            )}
          </div>
        ) : null}

        {isRecording ? (
          <div className="mb-2 rounded-[14px] border border-[rgba(224,57,57,0.25)] bg-[rgba(224,57,57,0.12)] px-3 py-2 text-[12px] text-[#ff9d9d]">
            Recording voice note. Tap stop when you’re done.
          </div>
        ) : null}

        <div
          onClick={() => textareaRef.current?.focus()}
          className={cn(
            "rounded-[28px] border bg-[#111826] px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition",
            isComposerFocused ? "border-[#2d8cff]/50" : "border-white/10",
          )}
        >
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#7bb7ff] transition hover:bg-white/10"
              aria-label="More attachments"
            >
              <Plus className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                imageInputRef.current?.click();
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#7bb7ff] transition hover:bg-white/10"
              aria-label="Take or choose photo"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                imageInputRef.current?.click();
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#7bb7ff] transition hover:bg-white/10"
              aria-label="Open gallery"
            >
              <GalleryIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                isRecording ? stopRecording() : void startRecording();
              }}
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full transition",
                isRecording ? "bg-[#a63a3a] text-white" : "text-[#7bb7ff] hover:bg-white/10",
              )}
              aria-label={isRecording ? "Stop recording" : "Record voice note"}
            >
              {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toast.message("Emoji picker coming soon");
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#7bb7ff] transition hover:bg-white/10"
                aria-label="Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-end gap-2 rounded-[24px] bg-white/5 px-3 py-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message"
              rows={1}
              className="min-h-[42px] flex-1 resize-none border-0 bg-transparent px-0 py-2 text-[15px] text-white outline-none placeholder:text-white/40"
            />

            <button
              type="button"
              onClick={handleQuickSend}
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full transition",
                draft.trim() || pendingAttachment
                  ? "bg-[#0A7C53] text-white shadow-[0_8px_20px_rgba(10,124,83,0.35)]"
                  : "bg-transparent text-[#7bb7ff] hover:bg-white/10",
              )}
              aria-label={draft.trim() || pendingAttachment ? "Send message" : "Send like"}
            >
              {draft.trim() || pendingAttachment ? <SendHorizonal className="h-5 w-5" /> : <ThumbsUp className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handlePickImage(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          void handlePickFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </section>
  );
}

function MessageContent({ message }: { message: ChatMessage }) {
  const hasCaption = !!message.text?.trim();

  if (message.kind === "image") {
    return (
      <div className="space-y-2">
        {message.mediaUrl ? (
          <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black/10">
            <img src={message.mediaUrl} alt={message.mediaName ?? "Shared image"} className="max-h-72 w-full object-cover" />
          </div>
        ) : null}
        {hasCaption ? <p className="whitespace-pre-wrap break-words text-[13px] leading-5">{message.text}</p> : null}
      </div>
    );
  }

  if (message.kind === "voice") {
    return (
      <div className="space-y-2">
        {hasCaption ? <p className="whitespace-pre-wrap break-words text-[13px] leading-5">{message.text}</p> : null}
        <div className="rounded-[16px] bg-white/10 p-2">
          <audio controls className="w-full">
            <source src={message.mediaUrl} type={message.mediaType ?? "audio/webm"} />
          </audio>
          <p className="mt-1 text-[11px] text-white/45">{formatDuration(message.durationMs)}</p>
        </div>
      </div>
    );
  }

  if (message.kind === "file") {
    return (
      <div className="space-y-2">
        {hasCaption ? <p className="whitespace-pre-wrap break-words text-[13px] leading-5">{message.text}</p> : null}
        <a
          href={message.mediaUrl}
          download={message.mediaName}
          className="flex items-center gap-3 rounded-[16px] bg-white/10 px-3 py-2 text-left"
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#17311f] text-[#49d18f]">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{message.mediaName ?? "Attached file"}</p>
            <p className="text-[11px] text-white/45">{message.mediaType ?? "File"}</p>
          </div>
          <Upload className="h-4 w-4 opacity-80" />
        </a>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-white">{message.text}</p>;
}
