import { Router } from "express";
import authRoutes from "./auth.route";
import personRoutes from "./person.route";
import transactionRoutes from "./transactions.route";
import dashboardRoutes from "./dashboard.route";

const router = Router();

router.use("/auth", authRoutes);
router.use("/person", personRoutes);
router.use("/transactions", transactionRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
