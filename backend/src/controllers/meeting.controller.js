import { Meeting } from "../models/meeting.model.js";
import { Room } from "../models/room.model.js";

export async function scheduleMeeting(req, res, next) {
  try {
    const { title, scheduledAt, durationMinutes } = req.body;
    if (!title || !scheduledAt) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Title and scheduled time are required",
        });
    }
    const roomId = Math.floor(
      1000000000 + Math.random() * 9000000000,
    ).toString();
    const meeting = await Meeting.create({
      title,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes || 30,
      roomId,
      host: req.user.id,
    });

    // Ensure room exists
    await Room.findOneAndUpdate(
      { roomId },
      { host: req.user.id, isActive: true },
      { upsert: true, new: true },
    );

    return res.status(201).json({ success: true, data: meeting });
  } catch (err) {
    next(err);
  }
}

export async function getScheduledMeetings(req, res, next) {
  try {
    const meetings = await Meeting.find({
      host: req.user.id,
      status: "upcoming",
    }).sort({ scheduledAt: 1 });
    return res.json({ success: true, data: meetings });
  } catch (err) {
    next(err);
  }
}

export async function cancelMeeting(req, res, next) {
  try {
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, host: req.user.id },
      { status: "cancelled" },
      { new: true },
    );
    if (!meeting)
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    return res.json({
      success: true,
      message: "Meeting cancelled successfully",
    });
  } catch (err) {
    next(err);
  }
}
