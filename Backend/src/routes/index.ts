import { Router } from "express";
import authRoutes from "./auth.route";
import personRoutes from "./person.route";
import transactionRoutes from "./transactions.route";
import dashboardRoutes from "./dashboard.route";
import notificationRoutes from "./notification.route";

import { container } from "tsyringe";
import { PersonController } from "../controllers/person.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const personController = container.resolve(PersonController);

router.use("/auth", authRoutes);

// Direct high-priority route
router.post("/send-request/:id", authMiddleware, personController.sendRequest);

router.use("/person", personRoutes);
router.use("/transactions", transactionRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);

export default router;
