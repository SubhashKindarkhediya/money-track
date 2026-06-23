import { Router } from "express";
import { GroupController } from "../controllers/group.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const groupController = new GroupController();

router.use(authMiddleware);

router.post("/", groupController.createGroup);
router.get("/", groupController.getGroups);

export default router;
