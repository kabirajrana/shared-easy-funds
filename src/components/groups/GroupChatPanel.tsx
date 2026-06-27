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
  Video,
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

type CallMode = "voice" | "video";
type CallPhase = "idle" | "dialing" | "ringing" | "connecting" | "active";
type CallSignal =
  | {
      type: "invite";
      callId: string;
      groupId: string;
      mode: CallMode;
      fromId: string;
      fromName: string;
      fromColor?: string;
      fromInitials?: string;
      createdAt: string;
    }
  | {
      type: "accept";
      callId: string;
      groupId: string;
      mode: CallMode;
      fromId: string;
      fromName: string;
      createdAt: string;
    }
  | {
      type: "decline";
      callId: string;
      groupId: string;
      fromId: string;
      fromName: string;
      createdAt: string;
    }
  | {
      type: "offer";
      callId: string;
      groupId: string;
      sdp: RTCSessionDescriptionInit;
      fromId: string;
      createdAt: string;
    }
  | {
      type: "answer";
      callId: string;
      groupId: string;
      sdp: RTCSessionDescriptionInit;
      fromId: string;
      createdAt: string;
    }
  | {
      type: "candidate";
      callId: string;
      groupId: string;
      candidate: RTCIceCandidateInit;
      fromId: string;
      createdAt: string;
    }
  | {
      type: "end";
      callId: string;
      groupId: string;
      fromId: string;
      createdAt: string;
    };

type IncomingCall = Extract<CallSignal, { type: "invite" }>;
type ActiveCall = {
  callId: string;
  mode: CallMode;
  phase: Exclude<CallPhase, "idle" | "ringing">;
  isHost: boolean;
  peerName: string;
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
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const callChannelRef = useRef<BroadcastChannel | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const recordStartedAtRef = useRef<number>(0);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);

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
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

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
      peerRef.current?.close();
      peerRef.current = null;
      callChannelRef.current?.close();
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!user || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`sajha:group-call:${groupId}`);
    callChannelRef.current = channel;

    channel.onmessage = (event) => {
      const signal = event.data as CallSignal | undefined;
      if (!signal || signal.groupId !== groupId || signal.fromId === user.id) return;

      if (signal.type === "invite") {
        if (activeCallRef.current || incomingCallRef.current) return;
        setIncomingCall(signal);
        setRemoteConnected(false);
        return;
      }

      const currentCall = activeCallRef.current;
      if (!currentCall || currentCall.callId !== signal.callId) return;

      if (signal.type === "decline") {
        toast.message(`${signal.fromName} declined the call`);
        endCall(false);
        return;
      }

      if (signal.type === "end") {
        endCall(false);
        return;
      }

      const pc = peerRef.current;
      if (!pc) return;

      if (signal.type === "accept" && currentCall.isHost && currentCall.phase === "dialing") {
        void (async () => {
          const nextPc = await attachPeer(currentCall.mode, true);
          const offer = await nextPc.createOffer();
          await nextPc.setLocalDescription(offer);
          channel.postMessage({
            type: "offer",
            callId: currentCall.callId,
            groupId,
            sdp: offer,
            fromId: user.id,
            createdAt: new Date().toISOString(),
          } satisfies CallSignal);
          setActiveCall((current) => (current ? { ...current, phase: "connecting" } : current));
        })();
        return;
      }

      if (signal.type === "offer" && !currentCall.isHost) {
        void (async () => {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          for (const candidate of pendingCandidatesRef.current.splice(0)) {
            try {
              await pc.addIceCandidate(candidate);
            } catch {}
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.postMessage({
            type: "answer",
            callId: signal.callId,
            groupId,
            sdp: answer,
            fromId: user.id,
            createdAt: new Date().toISOString(),
          } satisfies CallSignal);
          setActiveCall((current) => (current ? { ...current, phase: "active" } : current));
        })();
        return;
      }

      if (signal.type === "answer" && currentCall.isHost) {
        void (async () => {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          for (const candidate of pendingCandidatesRef.current.splice(0)) {
            try {
              await pc.addIceCandidate(candidate);
            } catch {}
          }
          setActiveCall((current) => (current ? { ...current, phase: "active" } : current));
          setRemoteConnected(true);
        })();
        return;
      }

      if (signal.type === "candidate") {
        void (async () => {
          const candidate = new RTCIceCandidate(signal.candidate);
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(candidate);
            } catch {}
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        })();
      }
    };

    return () => {
      channel.close();
      if (callChannelRef.current === channel) callChannelRef.current = null;
    };
  }, [groupId, user]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = localStreamRef.current;
  });

  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (videoEl) videoEl.srcObject = remoteStreamRef.current;
    const audioEl = remoteAudioRef.current;
    if (audioEl) audioEl.srcObject = remoteStreamRef.current;
  });

  const closeAttachment = () => setPendingAttachment(null);

  const sendCallSignal = (signal: CallSignal) => {
    callChannelRef.current?.postMessage(signal);
  };

  const attachPeer = async (mode: CallMode, isHost: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support calling.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video",
    });
    localStreamRef.current = stream;
    setRemoteConnected(false);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0] ?? null;
      setRemoteConnected(true);
    };
    pc.onicecandidate = (event) => {
      const currentCall = activeCallRef.current;
      if (!event.candidate || !currentCall) return;
      sendCallSignal({
        type: "candidate",
        callId: currentCall.callId,
        groupId,
        candidate: event.candidate.toJSON(),
        fromId: user?.id ?? "",
        createdAt: new Date().toISOString(),
      });
    };

    if (mode === "video") {
      setTimeout(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }, 0);
    }

    return pc;
  };

  const cleanupCall = (clearIncoming = true) => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteConnected(false);
    setActiveCall(null);
    if (clearIncoming) setIncomingCall(null);
  };

  const endCall = (notify = true) => {
    const currentCallId = activeCall?.callId ?? incomingCall?.callId;
    if (notify && currentCallId && user) {
      sendCallSignal({
        type: "end",
        callId: currentCallId,
        groupId,
        fromId: user.id,
        createdAt: new Date().toISOString(),
      });
    }
    cleanupCall();
  };

  const startOutgoingCall = (mode: CallMode) => {
    if (!user) {
      toast.error("Please sign in to place a call.");
      return;
    }
    if (activeCall || incomingCall) {
      toast.message("A call is already in progress.");
      return;
    }

    const callId = crypto.randomUUID();
    const next = {
      callId,
      mode,
      phase: "dialing" as const,
      isHost: true,
      peerName: groupName,
    };
    setActiveCall(next);
    setRemoteConnected(false);
    sendCallSignal({
      type: "invite",
      callId,
      groupId,
      mode,
      fromId: user.id,
      fromName: user.name,
      fromColor: user.avatarColor,
      fromInitials: user.initials,
      createdAt: new Date().toISOString(),
    });
    toast.message(`${mode === "video" ? "Video" : "Voice"} call started`);
  };

  const acceptIncomingCall = async () => {
    if (!user || !incomingCall) return;
    try {
      const next = {
        callId: incomingCall.callId,
        mode: incomingCall.mode,
        phase: "connecting" as const,
        isHost: false,
        peerName: incomingCall.fromName,
      };
      setIncomingCall(null);
      setActiveCall(next);
      const pc = await attachPeer(incomingCall.mode, false);
      sendCallSignal({
        type: "accept",
        callId: incomingCall.callId,
        groupId,
        mode: incomingCall.mode,
        fromId: user.id,
        fromName: user.name,
        createdAt: new Date().toISOString(),
      });
      void pc;
    } catch {
      toast.error("Could not start the call.");
      cleanupCall();
    }
  };

  const declineIncomingCall = () => {
    if (!user || !incomingCall) return;
    sendCallSignal({
      type: "decline",
      callId: incomingCall.callId,
      groupId,
      fromId: user.id,
      fromName: user.name,
      createdAt: new Date().toISOString(),
    });
    setIncomingCall(null);
  };


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
            aria-label="Voice call"
            onClick={() => startOutgoingCall("voice")}
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/85 transition hover:bg-white/10"
            aria-label="Video call"
            onClick={() => startOutgoingCall("video")}
          >
            <Video className="h-5 w-5" />
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

      {incomingCall ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#101827] p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#1C7E5D] text-white">
              <Phone className="h-7 w-7" />
            </div>
            <p className="mt-4 text-[12px] uppercase tracking-[0.2em] text-white/45">Incoming {incomingCall.mode} call</p>
            <h2 className="mt-2 text-[20px] font-semibold text-white">{incomingCall.fromName}</h2>
            <p className="mt-1 text-[13px] text-white/60">Someone in the group is calling you right now.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={declineIncomingCall}
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[14px] font-semibold text-white/80 hover:bg-white/10"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => void acceptIncomingCall()}
                className="flex-1 rounded-full bg-[#0A7C53] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(10,124,83,0.35)] hover:brightness-110"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeCall ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#071018] text-white">
          <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                {activeCall.mode === "video" ? "Video call" : "Voice call"}
              </p>
              <h2 className="text-[16px] font-semibold">{activeCall.peerName}</h2>
              <p className="text-[12px] text-white/50">
                {activeCall.phase === "dialing"
                  ? "Ringing..."
                  : activeCall.phase === "connecting"
                    ? "Connecting..."
                    : remoteConnected
                      ? "Connected"
                      : "Waiting for the other side"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => endCall()}
              className="grid h-11 w-11 place-items-center rounded-full bg-[#a63a3a] text-white shadow-[0_10px_24px_rgba(166,58,58,0.35)]"
              aria-label="End call"
            >
              <Phone className="h-5 w-5 rotate-[135deg]" />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden px-4 py-4">
            {activeCall.mode === "video" ? (
              <div className="grid h-full gap-3 md:grid-cols-[1.35fr_0.65fr]">
                <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  {!remoteConnected ? (
                    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_top,rgba(26,107,90,0.3),rgba(7,16,24,0.95))]">
                      <div className="text-center">
                        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/10 text-white/85">
                          <Video className="h-9 w-9" />
                        </div>
                        <p className="mt-4 text-[15px] font-semibold text-white">Waiting for video</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">You</p>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="aspect-[3/4] w-full rounded-[18px] bg-black object-cover"
                    />
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-3">
                    <p className="text-[12px] text-white/55">Audio is live once the call connects. You can end the call anytime.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(26,107,90,0.2),rgba(7,16,24,0.96))] px-6 text-center">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-[#1C7E5D] text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                  <Phone className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-[22px] font-semibold text-white">{activeCall.peerName}</h3>
                  <p className="mt-1 text-[13px] text-white/55">
                    {activeCall.phase === "dialing"
                      ? "Calling now..."
                      : activeCall.phase === "connecting"
                        ? "Connecting audio..."
                        : remoteConnected
                          ? "Connected"
                          : "Waiting for the other side"}
                  </p>
                </div>
                <audio ref={remoteAudioRef} autoPlay />
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#081019] px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!peerRef.current) return;
                  const tracks = localStreamRef.current?.getAudioTracks() ?? [];
                  tracks.forEach((track) => {
                    track.enabled = !track.enabled;
                  });
                }}
                className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/15"
                aria-label="Mute"
              >
                <Mic className="h-5 w-5" />
              </button>
              {activeCall.mode === "video" ? (
                <button
                  type="button"
                  onClick={() => {
                    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
                    tracks.forEach((track) => {
                      track.enabled = !track.enabled;
                    });
                  }}
                  className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-white/15"
                  aria-label="Toggle camera"
                >
                  <Video className="h-5 w-5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => endCall()}
                className="grid h-14 w-14 place-items-center rounded-full bg-[#a63a3a] text-white shadow-[0_10px_24px_rgba(166,58,58,0.35)]"
                aria-label="End call"
              >
                <Phone className="h-6 w-6 rotate-[135deg]" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
