import { Router } from "express";
import { GroupController } from "../controllers/group.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const groupController = new GroupController();

router.use(authMiddleware);

router.post("/", groupController.createGroup);
router.get("/", groupController.getGroups);
router.get("/:id", groupController.getGroupById);
router.put("/:id", groupController.updateGroup);
router.delete("/:id", groupController.deleteGroup);
router.post("/:id/join", groupController.joinGroup);
router.post("/:id/leave", groupController.leaveGroup);

export default router;
