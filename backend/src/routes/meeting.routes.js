import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  scheduleMeeting,
  getScheduledMeetings,
  cancelMeeting,
} from "../controllers/meeting.controller.js";

const router = Router();

router.use(authenticate);
router.post("/schedule", scheduleMeeting);
router.get("/", getScheduledMeetings);
router.delete("/:id", cancelMeeting);

export default router;
