import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { AuthService } from "../services/auth.service";
import User from "../models/user.model";

@injectable()
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user
   */
  signup = async (req: Request, res: Response) => {
    try {
      console.log("Signup Request Body:", req.body);

      const { first_name, last_name, email, phone_number, password, confirmPassword } = req.body;

      // Basic validation
      if (!first_name || !last_name || !email || !password || !confirmPassword) {
        res.status(400).json({
          error: "First name, last name, email, password and confirm password are required",
        });
        return;
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        res.status(400).json({ error: "Passwords do not match" });
        return;
      }

      const user = await this.authService.signup({
        first_name,
        last_name,
        email,
        phone_number,
        password,
        confirmPassword,
      });

      res.status(201).json({
        message: "User registered successfully",
        user,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Login user
   */
  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const { user, token } = await this.authService.login({ email, password });

      res.status(200).json({
        message: "Logged in successfully",
        user,
        token,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  };
 
  /**
   * Google Login
   */
  googleLogin = async (req: Request, res: Response) => {
    try {
      const { credential, isAccessToken } = req.body;
      if (!credential) {
        res.status(400).json({ error: "Google credential is required" });
        return;
      }

      const { user, token } = await this.authService.googleLogin(credential, isAccessToken);

      res.status(200).json({
        message: "Logged in with Google successfully",
        user,
        token,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  };

  /**
   * Update user profile
   */
  updateProfile = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.uid;
      const { 
        name, phone_number, gender, address,
        first_name, last_name, dob, id_card_no,
        currency, monthly_budget
      } = req.body;

      const updatedUser = await this.authService.updateProfile(userId, { 
        name, 
        phone_number, 
        gender, 
        address,
        first_name,
        last_name,
        dob,
        id_card_no,
        currency,
        monthly_budget
      });

      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Change user password
   */
  changePassword = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.uid;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Current and new passwords are required" });
        return;
      }

      const result = await this.authService.changePassword(userId, { currentPassword, newPassword });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Verify current session — checks if user still exists in DB
   * Used by frontend on app startup to detect deleted accounts
   */
  getMe = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.uid;
      const user = await User.findByPk(userId, {
        attributes: { exclude: ["password", "confirmPassword"] },
      });

      if (!user) {
        // User was deleted from DB — token is stale, force logout
        res.status(401).json({ error: "User no longer exists. Please login again." });
        return;
      }

      res.status(200).json({ user });
    } catch (error: any) {
      res.status(401).json({ error: "Invalid session" });
    }
  };

  /**
   * Request OTP
   */
  requestOtp = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const result = await this.authService.requestOtp(email);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Verify OTP
   */
  verifyOtp = async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        res.status(400).json({ error: "Email and OTP are required" });
        return;
      }

      const result = await this.authService.verifyOtp(email, otp);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * Reset Password
   */
  resetPassword = async (req: Request, res: Response) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        res.status(400).json({ error: "Email, OTP and new password are required" });
        return;
      }

      const result = await this.authService.resetPassword({ email, otp, newPassword });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
