import { Router } from "express";
import { container } from "tsyringe";
import { NotificationController } from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const notificationController = container.resolve(NotificationController);

router.use(authMiddleware);

router.get("/", notificationController.getAll);
router.patch("/:id/read", notificationController.markAsRead);
router.patch("/:id/response", notificationController.handleResponse);

export default router;
