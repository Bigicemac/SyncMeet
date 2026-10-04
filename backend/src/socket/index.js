import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";
import User from "../models/user.model.js";
import { Room } from "../models/room.model.js";

const rooms = new Map();

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
        socket.handshake.query?.token;

      if (!token) {
        console.log("socket auth failed: No token provided");
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(decoded.id).select("name");
      if (!user) {
        console.log("socket auth failed: User not found in database");
        return next(new Error("Unauthorized"));
      }

      socket.user = { id: user._id.toString(), name: user.name };
      next();
    } catch (err) {
      console.log("socket auth failed:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  const leaveRoom = (socket) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    socket.leave(roomId);
    socket.data.roomId = null;

    const room = rooms.get(roomId);
    if (!room) return;

    room.waitingQueue?.delete(socket.user.id);
    const p = room.participants.get(socket.user.id);
    if (p && p.socketId === socket.id) {
      room.participants.delete(socket.user.id);
      socket.to(roomId).emit("participant-left", { userId: socket.user.id });

      // If the disconnecting user is the active screen sharer, clear share state
      if (room.sharerId === socket.user.id) {
        room.sharerId = null;
        io.to(roomId).emit("screen-share-stopped");
      }
    }

    if (
      room.participants.size === 0 &&
      (!room.waitingQueue || room.waitingQueue.size === 0)
    ) {
      rooms.delete(roomId);
      setTimeout(async () => {
        if (!rooms.has(roomId)) {
          await Room.updateOne({ roomId }, { isActive: false }).catch(() => {});
        }
      }, 60000);
    }
  };

  io.on("connection", (socket) => {
    socket.on("join-room", async ({ roomId }, cb) => {
      try {
        const cleanId = roomId.replace(/[\s-]/g, "");
        const dbRoom = await Room.findOne({ roomId: cleanId, isActive: true });
        if (!dbRoom) return cb?.({ ok: false, error: "Room not found" });

        let room = rooms.get(cleanId);
        if (!room) {
          room = {
            hostId: dbRoom.host.toString(),
            sharerId: null,
            participants: new Map(),
            waitingQueue: new Map(),
          };
          rooms.set(cleanId, room);
        }

        const isHost = room.hostId === socket.user.id;
        const participant = {
          userId: socket.user.id,
          name: socket.user.name,
          socketId: socket.id,
          mic: true,
          camera: true,
          screen: false,
        };

        // If not host and host is present in the meeting room, enter waiting room
        const hostConnected = [...room.participants.values()].some(
          (p) => p.userId === room.hostId,
        );
        if (!isHost && hostConnected) {
          room.waitingQueue.set(socket.user.id, participant);
          socket.data.roomId = cleanId;

          // Notify host about the waiting participant
          const hostParticipant = [...room.participants.values()].find(
            (p) => p.userId === room.hostId,
          );
          if (hostParticipant) {
            io.to(hostParticipant.socketId).emit("join-request", {
              userId: socket.user.id,
              name: socket.user.name,
              socketId: socket.id,
            });
          }

          return cb?.({
            ok: true,
            isWaiting: true,
            message: "Waiting for host to accept your request...",
          });
        }

        // Host or direct joiner when no host is currently in room
        const existing = room.participants.get(socket.user.id);
        room.participants.set(socket.user.id, participant);
        if (existing && existing.socketId !== socket.id) {
          io.sockets.sockets.get(existing.socketId)?.disconnect(true);
        }

        socket.join(cleanId);
        socket.data.roomId = cleanId;

        socket.to(cleanId).emit("participant-joined", participant);
        cb?.({
          ok: true,
          isHost,
          hostId: room.hostId,
          sharerId: room.sharerId,
          participants: [...room.participants.values()],
          waitingQueue: isHost ? [...room.waitingQueue.values()] : [],
        });
      } catch {
        cb?.({ ok: false, error: "Could not join room" });
      }
    });

    socket.on("admit-participant", ({ userId }) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.user.id) return;

      const waitingUser = room.waitingQueue.get(userId);
      if (!waitingUser) return;

      room.waitingQueue.delete(userId);
      room.participants.set(userId, waitingUser);

      const targetSocket = io.sockets.sockets.get(waitingUser.socketId);
      if (targetSocket) {
        targetSocket.join(roomId);
        targetSocket.data.roomId = roomId; // Ensure roomId is set on the admitted guest socket
        targetSocket.emit("admitted", {
          hostId: room.hostId,
          sharerId: room.sharerId,
          participants: [...room.participants.values()],
        });
        io.to(roomId).emit("participant-joined", waitingUser);
      }
    });

    socket.on("reject-participant", ({ userId }) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.user.id) return;

      const waitingUser = room.waitingQueue.get(userId);
      if (!waitingUser) return;

      room.waitingQueue.delete(userId);
      const targetSocket = io.sockets.sockets.get(waitingUser.socketId);
      if (targetSocket) {
        targetSocket.emit("rejected", {
          message: "Host rejected the invitation",
        });
      }
    });

    socket.on("chat-message", ({ roomId, text }) => {
      const cleanRoomId =
        typeof roomId === "string" ? roomId.replace(/[\s-]/g, "") : null;
      const targetRoomId = socket.data.roomId || cleanRoomId;
      const clean = String(text || "")
        .trim()
        .slice(0, 1000);
      console.log(
        `[chat] from ${socket.user?.name} (${socket.user?.id}) in room ${targetRoomId}: "${clean}"`,
      );

      if (!targetRoomId || !clean) return;

      io.to(targetRoomId).emit("chat-message", {
        id: crypto.randomUUID(),
        userId: socket.user.id,
        name: socket.user.name,
        text: clean,
        at: Date.now(),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("mic-state", ({ muted }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const room = rooms.get(roomId);
      const p = room?.participants.get(socket.user.id);
      if (p) p.mic = !muted;

      console.log(
        `[mic-state] user ${socket.user?.name} (${socket.user?.id}) mic muted: ${muted}`,
      );

      // Broadcast mic-state report from user's browser to everyone in the room
      io.to(roomId).emit("mic-state", {
        userId: socket.user.id,
        socketId: socket.id,
        muted: Boolean(muted),
        mic: !muted,
      });
    });

    socket.on("media-state", ({ mic, camera, screen }) => {
      const roomId = socket.data.roomId;
      const p = rooms.get(roomId)?.participants.get(socket.user.id);
      if (!p) return;
      if (typeof mic === "boolean") p.mic = mic;
      if (typeof camera === "boolean") p.camera = camera;
      if (typeof screen === "boolean") p.screen = screen;
      socket.to(roomId).emit("media-state", {
        userId: socket.user.id,
        mic: p.mic,
        camera: p.camera,
        screen: p.screen,
      });
    });

    socket.on("screen-share-start", () => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.sharerId && room.sharerId !== socket.user.id) {
        return socket.emit("screen-share-denied", {
          reason: "Someone is already sharing",
        });
      }
      room.sharerId = socket.user.id;
      io.to(roomId).emit("screen-share-started", { userId: socket.user.id });
    });

    socket.on("screen-share-stop", () => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (!room || !room.sharerId) return;
      const isSharer = room.sharerId === socket.user.id;
      const isHost = room.hostId === socket.user.id;
      if (!isSharer && !isHost) return; // everyone else is ignored
      room.sharerId = null;
      io.to(roomId).emit("screen-share-stopped");
    });

    socket.on("end-meeting", async () => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.user.id) return; // host only
      io.to(roomId).emit("meeting-ended");
      rooms.delete(roomId);
      await Room.updateOne({ roomId }, { isActive: false }).catch(() => {});
    });

    socket.on("kick-participant", ({ userId }) => {
      const room = rooms.get(socket.data.roomId);
      if (!room || room.hostId !== socket.user.id || userId === room.hostId)
        return;
      const target = room.participants.get(userId);
      if (!target) return;
      const targetSocket = io.sockets.sockets.get(target.socketId);
      targetSocket?.emit("kicked");
      if (targetSocket) leaveRoom(targetSocket);
    });

    socket.on("mute-participant", ({ userId, targetSocketId }) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      console.log(
        `[mute-participant] host ${socket.user?.id} muting target ${userId} in room ${roomId}`,
      );
      if (!room || room.hostId !== socket.user.id) return; // host only

      const target = userId ? room.participants.get(userId) : null;
      const targetSId = targetSocketId || target?.socketId;
      if (target) target.mic = false;

      if (targetSId) {
        io.to(targetSId).emit("force-mute", { userId });
      }
      io.to(roomId).emit("force-mute", { userId });
      io.to(roomId).emit("mic-state", {
        userId,
        socketId: targetSId,
        muted: true,
        mic: false,
      });
    });

    socket.on("mute-all", () => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.user.id) return;
      for (const [uid, p] of room.participants.entries()) {
        if (uid !== room.hostId) {
          p.mic = false;
          if (p.socketId) io.to(p.socketId).emit("force-mute", { userId: uid });
          io.to(roomId).emit("force-mute", { userId: uid });
          io.to(roomId).emit("mic-state", {
            userId: uid,
            socketId: p.socketId,
            muted: true,
            mic: false,
          });
        }
      }
    });

    ["offer", "answer", "ice-candidate"].forEach((evt) => {
      socket.on(evt, ({ to, data }) => {
        const target = io.sockets.sockets.get(to);
        if (!target || target.data.roomId !== socket.data.roomId) return;
        target.emit(evt, { from: socket.id, userId: socket.user.id, data });
      });
    });

    socket.on("leave-room", () => leaveRoom(socket));
    socket.on("disconnect", () => leaveRoom(socket));
  });

  return io;
};

export const initSocketServer = initSocket;
