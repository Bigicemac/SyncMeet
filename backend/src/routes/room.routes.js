import { 
    Router
 } from "express";
import { 
    createRoom, getRoom 
} from "../controllers/room.controller.js";
import { 
    verifyJWT
 } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // every room route needs a logged-in user

router.post("/", createRoom);
router.get("/:roomId", getRoom);

export default router;