import { Router } from "express";
import { container } from "tsyringe";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Resolve controller from DI container
const authController = container.resolve(AuthController);

// Signup Route
router.post("/signup", authController.signup);

// Login Route
router.post("/login", authController.login);

// Google Login Route
router.post("/google-login", authController.googleLogin);

// Verify session — checks if user still exists in DB
// Frontend calls this on every app start to catch deleted accounts
router.get("/me", authMiddleware, authController.getMe);

// Update Profile Route
router.patch("/profile", authMiddleware, authController.updateProfile);
router.post("/change-password", authMiddleware, authController.changePassword);

// Password Reset Routes
router.post("/request-otp", authController.requestOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.delete("/delete-account", authMiddleware, authController.deleteAccount);

export default router;
