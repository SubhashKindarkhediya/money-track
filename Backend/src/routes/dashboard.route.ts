import { Router } from "express";
import { container } from "tsyringe";
import { DashboardController } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Resolve controller from DI container
const dashboardController = container.resolve(DashboardController);

// Protect dashboard route
router.use(authMiddleware);

// Endpoint: Get summary totals
router.get("/summary", dashboardController.getSummary);

// Endpoint: Get detailed monthly report (with list of transactions)
router.get("/report", dashboardController.getReport);

export default router;
