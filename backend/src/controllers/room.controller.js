import { 
    nanoid 
} from "nanoid";
import { 
    Room 
} from "../models/room.model.js";
import { 
    ApiError
 } from "../utils/ApiError.js";
import {
    asyncHandler
 } from "../utils/asyncHandler.js";

export const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create({
    roomId: nanoid(10),
    host: req.user._id,
  });

  res.status(201).json({ success: true, data: room });
});

export const getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOne({
    roomId: req.params.roomId,
    isActive: true,
  }).populate("host", "name email");

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  res.status(200).json({ success: true, data: room });
});