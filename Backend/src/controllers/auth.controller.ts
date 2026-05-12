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
   * Update user profile
   */
  updateProfile = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.uid;
      const { 
        name, phone_number, gender, address,
        first_name, last_name, dob, id_card_no
      } = req.body;

      const updatedUser = await this.authService.updateProfile(userId, { 
        name, 
        phone_number, 
        gender, 
        address,
        first_name,
        last_name,
        dob,
        id_card_no
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
}
