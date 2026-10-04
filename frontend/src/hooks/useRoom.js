import { useEffect, useRef, useState } from "react";
import { connectSocket } from "../lib/socket";
import { useNotifications } from "../context/NotificationContext";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function useRoom({
  roomId,
  token,
  currentUserId,
  currentUserName,
  initialMic,
  initialCamera,
  onKicked,
}) {
  const notifContext = useNotifications();
  const addNotification = notifContext?.addNotification;

  const [participants, setParticipants] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [sharerId, setSharerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [mic, setMic] = useState(initialMic);
  const [camera, setCamera] = useState(initialCamera);
  const [sharing, setSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const peersRef = useRef({});
  const localRef = useRef(null);
  const screenRef = useRef(null);
  const cameraRef = useRef(initialCamera); // track camera state inside effect
  const participantsRef = useRef([]);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;
    const socket = connectSocket(token);
    socketRef.current = socket;

    // ── peer helpers ──────────────────────────────────────────────────────────

    const removePeer = (userId) => {
      const peer = peersRef.current[userId];
      if (!peer) return;
      peer.pc.close();
      delete peersRef.current[userId];
      setRemoteStreams((prev) => {
        const n = { ...prev };
        delete n[userId];
        return n;
      });
    };

    const createPeer = (userId, remoteSocketId) => {
      if (peersRef.current[userId]) peersRef.current[userId].pc.close();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      const entry = { pc, socketId: remoteSocketId, iceBuf: [] };
      peersRef.current[userId] = entry;

      // Add local tracks
      const loc = localRef.current;
      if (loc) {
        loc.getAudioTracks().forEach((t) => pc.addTrack(t, loc));
        const vt = screenRef.current
          ? screenRef.current.getVideoTracks()[0]
          : loc.getVideoTracks()[0];
        if (vt) pc.addTrack(vt, loc);
      }

      pc.onicecandidate = ({ candidate }) => {
        if (candidate)
          socket.emit("ice-candidate", { to: remoteSocketId, data: candidate });
      };

      pc.ontrack = ({ streams, track }) => {
        console.log(
          "[WebRTC] ontrack from",
          userId,
          track.kind,
          "streams:",
          streams?.length,
        );
        const stream = streams?.[0] ?? new MediaStream([track]);
        setRemoteStreams((prev) => ({ ...prev, [userId]: stream }));
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] state for", userId, "->", pc.connectionState);
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          if (peersRef.current[userId]?.pc === pc) removePeer(userId);
        }
      };
      return entry;
    };

    // Drain buffered ICE candidates once remote description is set
    const drainIce = async (entry) => {
      if (!entry?.iceBuf?.length) return;
      const buf = entry.iceBuf.splice(0);
      for (const c of buf) {
        await entry.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
    };

    // Replace video track on all active peers (for screen-share or camera toggle)
    const replaceVideoInPeers = async (track) => {
      for (const { pc, socketId } of Object.values(peersRef.current)) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(track || null).catch(() => {});
        } else if (track) {
          try {
            pc.addTrack(track, localRef.current ?? new MediaStream([track]));
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { to: socketId, data: offer });
          } catch (e) {
            console.error("[WebRTC] replaceVideo renegotiate error:", e);
          }
        }
      }
    };

    // ── room setup ────────────────────────────────────────────────────────────

    const setupConnectedRoom = async (res) => {
      if (cancelled) return;
      setIsWaiting(false);
      setHostId(res.hostId);
      if (res.sharerId) setSharerId(res.sharerId);
      setParticipants(res.participants ?? []);
      if (res.waitingQueue) setWaitingQueue(res.waitingQueue);
      socket.emit("media-state", {
        mic: initialMic,
        camera: initialCamera,
        screen: false,
      });

      console.log(
        "[Room] setupConnectedRoom — my socket:",
        socket.id,
        "| participants:",
        (res.participants ?? [])
          .map((p) => p.userId + "/" + p.socketId)
          .join(", "),
      );

      for (const p of res.participants ?? []) {
        if (p.socketId === socket.id) continue; // skip self
        const existing = peersRef.current[p.userId];
        if (existing?.pc?.connectionState === "connected") continue;
        try {
          console.log("[WebRTC] Sending offer to", p.userId, p.socketId);
          const entry = createPeer(p.userId, p.socketId);
          const offer = await entry.pc.createOffer();
          await entry.pc.setLocalDescription(offer);
          socket.emit("offer", { to: p.socketId, data: offer });
        } catch (err) {
          console.error("[WebRTC] offer error:", err);
        }
      }
    };

    const join = () => {
      const clean =
        typeof roomId === "string" ? roomId.replace(/[\s-]/g, "") : roomId;
      socket.emit("join-room", { roomId: clean }, async (res) => {
        if (!res?.ok) {
          setError(res?.error || "Could not join the room");
          return;
        }
        if (res.isWaiting) {
          setIsWaiting(true);
          return;
        }
        Object.keys(peersRef.current).forEach(removePeer);
        await setupConnectedRoom(res);
      });
    };

    // ── socket event handlers ─────────────────────────────────────────────────

    socket.on("connect_error", () =>
      setError("Could not connect to the server"),
    );

    socket.on("join-request", (req) => {
      setWaitingQueue((prev) => [
        ...prev.filter((x) => x.userId !== req.userId),
        req,
      ]);
      addNotification?.({
        title: "Join Request",
        message: `${req.name} wants to join.`,
        type: "user",
      });
    });

    socket.on("admitted", async (res) => {
      setIsWaiting(false);
      Object.keys(peersRef.current).forEach(removePeer);
      await setupConnectedRoom(res);
      addNotification?.({
        title: "Admitted",
        message: "You were admitted to the meeting.",
        type: "meeting",
      });
    });

    socket.on("rejected", ({ message }) => {
      setIsWaiting(false);
      setError(message || "Host rejected the invitation");
    });

    socket.on("participant-joined", (p) => {
      console.log(
        "[Room] participant-joined:",
        p.userId,
        p.socketId,
        "| my id:",
        socket.id,
      );
      setParticipants((prev) => [
        ...prev.filter((x) => x.userId !== p.userId),
        p,
      ]);
      setWaitingQueue((prev) => prev.filter((x) => x.userId !== p.userId));
      addNotification?.({
        title: "Participant Joined",
        message: `${p.name || "Someone"} joined.`,
        type: "user",
      });

      // Pre-create peer so it's ready for the incoming offer from this participant.
      // We do NOT send an offer ourselves (they will send one via setupConnectedRoom).
      if (p.socketId && p.socketId !== socket.id) {
        const existing = peersRef.current[p.userId];
        if (
          !existing ||
          existing.pc.connectionState === "closed" ||
          existing.pc.connectionState === "failed"
        ) {
          console.log(
            "[WebRTC] Pre-creating peer for incoming participant:",
            p.userId,
          );
          createPeer(p.userId, p.socketId);
        }
      }
    });

    socket.on("participant-left", ({ userId }) => {
      const pName =
        participantsRef.current.find((x) => x.userId === userId)?.name ||
        "Someone";
      removePeer(userId);
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
      setWaitingQueue((prev) => prev.filter((p) => p.userId !== userId));
      addNotification?.({
        title: "Participant Left",
        message: `${pName} left.`,
        type: "user",
      });
    });

    // FIX: only update fields that are actually present in the event payload
    socket.on("media-state", ({ userId, mic: m, camera: c, screen: s }) => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.userId !== userId) return p;
          return {
            ...p,
            ...(m !== undefined && { mic: m }),
            ...(c !== undefined && { camera: c }),
            ...(s !== undefined && { screen: s }),
          };
        }),
      );
    });

    socket.on("screen-share-started", ({ userId }) => {
      setSharerId(userId);
      addNotification?.({
        title: "Screen Share Started",
        message: "Screen sharing is active.",
        type: "share",
      });
    });

    socket.on("screen-share-stopped", async () => {
      setSharerId(null);
      if (screenRef.current) {
        screenRef.current.getTracks().forEach((t) => t.stop());
        screenRef.current = null;
        setScreenStream(null);
        // Restore camera track if camera is on
        const camTrack = cameraRef.current
          ? localRef.current?.getVideoTracks()[0]
          : null;
        await replaceVideoInPeers(camTrack ?? null);
        setSharing(false);
      }
      addNotification?.({
        title: "Screen Share Ended",
        message: "Screen sharing stopped.",
        type: "share",
      });
    });

    socket.on("screen-share-denied", ({ reason }) =>
      setError(reason || "Screen sharing unavailable"),
    );
    socket.on("meeting-ended", () => onKicked?.());
    socket.on("kicked", () => onKicked?.());

    socket.on("force-mute", (data) => {
      const targetId = data?.userId;
      const myUserId = currentUserIdRef.current;
      console.log(
        "[Mute] force-mute event received, targetId:",
        targetId,
        "myUserId:",
        myUserId,
      );
      if (targetId && myUserId && String(targetId) !== String(myUserId)) {
        return; // Mute target is someone else, ignore
      }

      console.log("[Mute] Silencing microphone for my account!");
      if (localRef.current) {
        localRef.current.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      Object.values(peersRef.current).forEach(({ pc }) => {
        pc.getSenders().forEach((s) => {
          if (s.track?.kind === "audio" && s.track) s.track.enabled = false;
        });
      });

      setMic(false);
      socket.emit("mic-state", { muted: true });
      addNotification?.({
        title: "Muted",
        message: "The host muted your microphone.",
        type: "system",
      });
    });

    socket.on("mic-state", ({ userId, socketId, muted, mic: micOn }) => {
      const isMuted = muted !== undefined ? muted : !micOn;
      setParticipants((prev) =>
        prev.map((p) => {
          if (
            (userId && p.userId === userId) ||
            (socketId && p.socketId === socketId)
          ) {
            return { ...p, mic: !isMuted };
          }
          return p;
        }),
      );
    });

    socket.on("chat-message", (m) => {
      console.log("[Chat] received:", m);
      setMessages((prev) => {
        if (m.id && prev.some((x) => x.id === m.id)) return prev;
        return [...prev, m];
      });
    });

    socket.on("offer", async ({ from, userId, data }) => {
      console.log("[WebRTC] Got offer from userId:", userId);
      try {
        let entry = peersRef.current[userId];
        if (!entry) {
          console.log(
            "[WebRTC] No pre-created peer — creating now for",
            userId,
          );
          entry = createPeer(userId, from);
        } else {
          entry.socketId = from;
        }
        // Handle glare: if we already sent a local offer, roll it back
        if (entry.pc.signalingState === "have-local-offer") {
          await entry.pc
            .setLocalDescription({ type: "rollback" })
            .catch(() => {});
        }
        await entry.pc.setRemoteDescription(new RTCSessionDescription(data));
        await drainIce(entry);
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        socket.emit("answer", { to: from, data: answer });
        console.log("[WebRTC] Sent answer to", userId);
      } catch (err) {
        console.error("[WebRTC] offer handling error:", err);
      }
    });

    socket.on("answer", async ({ userId, data }) => {
      console.log("[WebRTC] Got answer from", userId);
      try {
        const entry = peersRef.current[userId];
        if (!entry) {
          console.warn("[WebRTC] No peer for answer from", userId);
          return;
        }
        await entry.pc.setRemoteDescription(new RTCSessionDescription(data));
        await drainIce(entry);
      } catch (err) {
        console.error("[WebRTC] answer error:", err);
      }
    });

    socket.on("ice-candidate", async ({ userId, data }) => {
      try {
        const entry = peersRef.current[userId];
        if (!entry) return;
        if (entry.pc.remoteDescription?.type) {
          await entry.pc
            .addIceCandidate(new RTCIceCandidate(data))
            .catch(() => {});
        } else {
          entry.iceBuf.push(data);
        }
      } catch (err) {
        console.error("[WebRTC] ICE error:", err);
      }
    });

    // ── media acquisition → then join ─────────────────────────────────────────

    const start = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: initialCamera,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        } catch {
          setError("Camera or microphone access was denied");
          return;
        }
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.getAudioTracks().forEach((t) => (t.enabled = initialMic));
      localRef.current = stream;
      setLocalStream(stream);

      // IMPORTANT: join only AFTER localRef is set so createPeer has tracks to add
      socket.on("connect", join);
      if (socket.connected) join();
    };

    start();

    return () => {
      cancelled = true;
      socket.emit("leave-room");
      socket.disconnect();
      Object.keys(peersRef.current).forEach(removePeer);
      localRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      screenRef.current = null;
    };
  }, [roomId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── controls ────────────────────────────────────────────────────────────────

  const toggleMic = () => {
    const nextMic = !mic;
    if (localRef.current) {
      localRef.current.getAudioTracks().forEach((t) => (t.enabled = nextMic));
    }
    setMic(nextMic);
    socketRef.current?.emit("mic-state", { muted: !nextMic });
    socketRef.current?.emit("media-state", { mic: nextMic });
  };

  const replaceVideo = async (track) => {
    for (const { pc, socketId } of Object.values(peersRef.current)) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(track || null).catch(() => {});
      } else if (track) {
        try {
          pc.addTrack(track, localRef.current ?? new MediaStream([track]));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("offer", { to: socketId, data: offer });
        } catch (e) {
          console.error("[WebRTC] replaceVideo error:", e);
        }
      }
    }
  };

  const toggleCamera = async () => {
    const next = !camera;
    if (!next) {
      localRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
      await replaceVideo(null);
      setCamera(false);
      socketRef.current?.emit("media-state", { camera: false });
    } else {
      let vt = localRef.current?.getVideoTracks()[0];
      if (!vt || vt.readyState === "ended") {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: true });
          vt = s.getVideoTracks()[0];
          localRef.current?.getVideoTracks().forEach((t) => {
            t.stop();
            localRef.current.removeTrack(t);
          });
          localRef.current?.addTrack(vt);
        } catch {
          return;
        }
      } else {
        vt.enabled = true;
      }
      setLocalStream(new MediaStream(localRef.current.getTracks()));
      await replaceVideo(vt);
      setCamera(true);
      socketRef.current?.emit("media-state", { camera: true });
    }
  };

  const startShare = async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenRef.current = screen;
      setScreenStream(screen);
      const track = screen.getVideoTracks()[0];
      track.onended = stopShare;
      await replaceVideo(track);
      setSharing(true);
      socketRef.current?.emit("media-state", { screen: true });
      socketRef.current?.emit("screen-share-start");
    } catch (err) {
      console.error("[Room] screen share error:", err);
    }
  };

  const stopShare = async () => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    setScreenStream(null);
    const fallback = camera
      ? (localRef.current?.getVideoTracks()[0] ?? null)
      : null;
    await replaceVideo(fallback);
    setSharing(false);
    socketRef.current?.emit("media-state", { screen: false });
    socketRef.current?.emit("screen-share-stop");
  };

  const endMeeting = () => socketRef.current?.emit("end-meeting");

  const sendMessage = (text) => {
    if (!text?.trim()) return;
    const cleanRoomId =
      typeof roomId === "string"
        ? roomId.replace(/[\s-]/g, "")
        : String(roomId);
    socketRef.current?.emit("chat-message", {
      roomId: cleanRoomId,
      text: text.trim(),
    });
  };

  const kick = (uid) =>
    socketRef.current?.emit("kick-participant", { userId: uid });
  const admitParticipant = (uid) => {
    setWaitingQueue((p) => p.filter((x) => x.userId !== uid));
    socketRef.current?.emit("admit-participant", { userId: uid });
  };
  const rejectParticipant = (uid) => {
    setWaitingQueue((p) => p.filter((x) => x.userId !== uid));
    socketRef.current?.emit("reject-participant", { userId: uid });
  };
  const muteParticipant = (uid) => {
    const target = participants.find((x) => String(x.userId) === String(uid));
    socketRef.current?.emit("mute-participant", {
      userId: uid,
      targetSocketId: target?.socketId,
    });
  };
  const muteAll = () => socketRef.current?.emit("mute-all");

  return {
    participants,
    hostId,
    sharerId,
    messages,
    remoteStreams,
    localStream,
    screenStream,
    mic,
    camera,
    sharing,
    isWaiting,
    waitingQueue,
    error,
    toggleMic,
    toggleCamera,
    startShare,
    stopShare,
    endMeeting,
    sendMessage,
    kick,
    admitParticipant,
    rejectParticipant,
    muteParticipant,
    muteAll,
  };
}
