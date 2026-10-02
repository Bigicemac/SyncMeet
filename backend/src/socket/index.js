import {
    Server
} from "socket.io";
import jwt from "jsonwebtoken";
import {
    env
} from "../config/env.js";
import {
    User
} from "../models/user.js";
import {
    Room
} from "../models/room.model.js";

const rooms = new Map();

export const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: { origin: "http://localhost:5173", credentials: true },
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("Unauthorized"));

            const decoded = jwt.verify(token, env.jwtSecret);
            const user = await User.findById(decoded.id).select("name");
            if (!user) return next(new Error("Unauthorized"));

            socket.user = { id: user._id.toString(), name: user.name };
            next();
        } catch {
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

        const p = room.participants.get(socket.user.id);
        if (p && p.socketId === socket.id) {
            room.participants.delete(socket.user.id);
            socket.to(roomId).emit("participant-left", { userId: socket.user.id });
        }
        if (room.participants.size === 0) rooms.delete(roomId);
    };

    io.on("connection", (socket) => {
        socket.on("join-room", async ({ roomId }, cb) => {
            try {
                const dbRoom = await Room.findOne({ roomId, isActive: true });
                if (!dbRoom) return cb?.({ ok: false, error: "Room not found" });

                let room = rooms.get(roomId);
                if (!room) {
                    room = { hostId: dbRoom.host.toString(), participants: new Map() };
                    rooms.set(roomId, room);
                }

                const existing = room.participants.get(socket.user.id);
                const participant = {
                    userId: socket.user.id,
                    name: socket.user.name,
                    socketId: socket.id,
                    mic: true,
                    camera: true,
                    screen: false,
                };
                room.participants.set(socket.user.id, participant);
                if (existing && existing.socketId !== socket.id) {
                    io.sockets.sockets.get(existing.socketId)?.disconnect(true);
                }

                socket.join(roomId);
                socket.data.roomId = roomId;

                socket.to(roomId).emit("participant-joined", participant);
                cb?.({
                    ok: true,
                    hostId: room.hostId,
                    participants: [...room.participants.values()],
                });
            } catch {
                cb?.({ ok: false, error: "Could not join room" });
            }
        });

        socket.on("chat-message", ({ text }) => {
            const roomId = socket.data.roomId;
            if (!roomId || !text?.trim()) return;
            io.to(roomId).emit("chat-message", {
                userId: socket.user.id,
                name: socket.user.name,
                text: text.trim(),
                timestamp: new Date().toISOString(),
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
                userId: socket.user.id, mic: p.mic, camera: p.camera, screen: p.screen,
            });
        });

        socket.on("kick-participant", ({ userId }) => {
            const room = rooms.get(socket.data.roomId);
            if (!room || room.hostId !== socket.user.id || userId === room.hostId) return;
            const target = room.participants.get(userId);
            if (!target) return;
            const targetSocket = io.sockets.sockets.get(target.socketId);
            targetSocket?.emit("kicked");
            if (targetSocket) leaveRoom(targetSocket);
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