import { nanoid } from "nanoid";
import { Room } from "../models/room.model.js";
import User from "../database/models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createRoom = asyncHandler(async (req, res) => {
  const { customRoomId } = req.body || {};
  let targetRoomId = customRoomId
    ? customRoomId.replace(/[\s-]/g, "")
    : nanoid(10);

  let room = await Room.findOne({ roomId: targetRoomId });
  if (room) {
    room.isActive = true;
    room.host = req.user._id;
    await room.save();
  } else {
    room = await Room.create({
      roomId: targetRoomId,
      host: req.user._id,
      isActive: true,
    });
  }

  res.status(201).json({ success: true, data: room });
});

export const getRoom = asyncHandler(async (req, res) => {
  const cleanId = req.params.roomId.replace(/[\s-]/g, "");
  let room = await Room.findOne({ roomId: cleanId }).populate(
    "host",
    "name email",
  );

  if (room) {
    if (!room.isActive) {
      room.isActive = true;
      await room.save();
    }
  } else {
    // Check if cleanId belongs to a user's personalMeetingId
    const hostUser = await User.findOne({ personalMeetingId: cleanId });
    if (hostUser) {
      room = await Room.create({
        roomId: cleanId,
        host: hostUser._id,
        isActive: true,
      });
      room = await room.populate("host", "name email");
    }
  }

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  res.status(200).json({ success: true, data: room });
});
