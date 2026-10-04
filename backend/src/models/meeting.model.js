import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },
    roomId: { type: String, required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled"],
      default: "upcoming",
    },
  },
  { timestamps: true },
);

export const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;
