import { singleton } from "tsyringe";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import Person from "../models/person.model";
import { MailService } from "./mail.service";

@singleton()
export class AuthService {
  constructor(private mailService: MailService) {}

  /**
   * Register a new user
   * @param data { first_name, last_name, email, phone_number, password }
   */
  async signup(data: any) {
    const { first_name, last_name, email, phone_number, password } = data;

    // 1. Check if user already exists (Email or Phone)
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      throw new Error("User already exists with this email");
    }

    if (phone_number) {
      const existingPhone = await User.findOne({ where: { phone_number } });
      if (existingPhone) {
        throw new Error("Mobile number already registered with another account");
      }
    }

    // 2. Hash the password (security step)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create user in database
    const newUser = await User.create({
      first_name,
      last_name,
      name: `${first_name} ${last_name}`.trim(),
      email,
      phone_number,
      password: hashedPassword,
      confirmPassword: hashedPassword, // Storing hashed version for consistency if required by model
    });

    // --- MoneyTrail Connection Logic ---
    // After user is created, link them to any existing people who added this phone number
    if (phone_number) {
      await Person.update(
        { linked_user_id: newUser.id },
        { where: { phone: phone_number } }
      );
    }
    // ------------------------------------

    const userResponse = newUser.toJSON();
    delete (userResponse as any).password;
    delete (userResponse as any).confirmPassword;

    return userResponse;
  }

  /**
   * User login
   * @param data { email, password }
   */
  async login(data: any) {
    const { email, password } = data;

    // 1. Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // 2. Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // 3. Generate JWT Token
    // Secret key "my-secret-key" can be anything for now,
    // ideally it should be in .env file.
    const token = jwt.sign(
      { uid: user.id, email: user.email },
      process.env.JWT_SECRET || "super-secret-key",
      { expiresIn: "1d" }, // Token valid for 1 day
    );

    const userResponse = user.toJSON();
    delete (userResponse as any).password;

    return { user: userResponse, token };
  }

  /**
   * Google Login service
   * @param credential {string} Google ID Token or Access Token
   * @param isAccessToken {boolean} Whether the credential is an Access Token
   */
  async googleLogin(credential: string, isAccessToken: boolean = false) {
    let payload: any;

    if (isAccessToken) {
      // Verify Access Token via Google's userinfo endpoint
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
        headers: { Authorization: `Bearer ${credential}` }
      });
      payload = await response.json();
      
      if (!payload.email) {
        throw new Error("Invalid Google access token");
      }
    } else {
      const { OAuth2Client } = await import("google-auth-library");
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      // Verify the ID Token from Google
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      payload = ticket.getPayload();
    }

    if (!payload || !payload.email) {
      throw new Error("Invalid Google token");
    }

    const { email, given_name, family_name, picture, sub: googleId } = payload;

    // 1. Find or create user by email
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Create new user if not exists
      user = await User.create({
        first_name: given_name || "Google",
        last_name: family_name || "User",
        name: payload.name || `${given_name} ${family_name}`.trim(),
        email,
        password: await bcrypt.hash(googleId, 10), // Set a random hashed password
        confirmPassword: await bcrypt.hash(googleId, 10),
      });
    }

    // 2. Generate JWT Token
    const token = jwt.sign(
      { uid: user.id, email: user.email },
      process.env.JWT_SECRET || "super-secret-key",
      { expiresIn: "1d" },
    );

    const userResponse = user.toJSON();
    delete (userResponse as any).password;
    delete (userResponse as any).confirmPassword;

    return { user: userResponse, token };
  }

  /**
   * Update user profile
   * @param userId {string}
   * @param data { name, phone_number, gender, address, first_name, last_name, dob, id_card_no, currency, monthly_budget }
   */
  async updateProfile(userId: string, data: any) {
    const { 
      name, phone_number, gender, address, 
      first_name, last_name, dob, id_card_no,
      currency, monthly_budget
    } = data;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    
    // Auto-update combined name for legacy support
    if (first_name || last_name) {
      user.name = `${first_name || user.first_name || ''} ${last_name || user.last_name || ''}`.trim();
    } else if (name) {
      user.name = name;
    }

    if (phone_number !== undefined && phone_number !== user.phone_number) {
      // Check if the new phone number is already taken
      if (phone_number) {
        const existingPhone = await User.findOne({ where: { phone_number } });
        if (existingPhone) {
          throw new Error("This mobile number is already in use by another user");
        }
      }
      user.phone_number = phone_number;
      
      // Re-link MoneyTrail connection for the new phone number
      await Person.update(
        { linked_user_id: user.id },
        { where: { phone: phone_number } }
      );
    }
    
    if (gender !== undefined) user.gender = gender;
    if (address !== undefined) user.address = address;
    if (dob !== undefined) user.dob = dob;
    if (id_card_no !== undefined) user.id_card_no = id_card_no;
    if (currency !== undefined) user.currency = currency;
    if (monthly_budget !== undefined) user.monthly_budget = monthly_budget;
    
    await user.save();

    const userResponse = user.toJSON();
    delete (userResponse as any).password;
    delete (userResponse as any).confirmPassword;

    return userResponse;
  }

  /**
   * Change user password (requires knowing current password)
   */
  async changePassword(userId: string, data: any) {
    const { currentPassword, newPassword } = data;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Compare current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error("Incorrect current password");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    user.password = hashedPassword;
    user.confirmPassword = hashedPassword;
    await user.save();

    return { message: "Password updated successfully" };
  }

  /**
   * Request OTP for password reset
   * @param email {string}
   */
  async requestOtp(email: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("User with this email does not exist");
    }

    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Set expiry (10 minutes from now)
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    // 3. Save to user
    user.reset_otp = otp;
    user.reset_otp_expires = expiry;
    await user.save();

    // 4. Send Email
    await this.mailService.sendOtpEmail(email, otp);

    return { message: "OTP sent successfully" };
  }

  /**
   * Verify OTP
   * @param email {string}
   * @param otp {string}
   */
  async verifyOtp(email: string, otp: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.reset_otp || user.reset_otp !== otp) {
      throw new Error("Invalid OTP");
    }

    if (!user.reset_otp_expires || user.reset_otp_expires < new Date()) {
      throw new Error("OTP has expired");
    }

    return { message: "OTP verified successfully" };
  }

  /**
   * Reset Password
   * @param data { email, otp, newPassword }
   */
  async resetPassword(data: any) {
    const { email, otp, newPassword } = data;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("User not found");
    }

    // Verify OTP again for security
    if (!user.reset_otp || user.reset_otp !== otp) {
      throw new Error("Invalid OTP");
    }

    if (!user.reset_otp_expires || user.reset_otp_expires < new Date()) {
      throw new Error("OTP has expired");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user
    user.password = hashedPassword;
    user.confirmPassword = hashedPassword;
    user.reset_otp = undefined; // Clear OTP after use
    user.reset_otp_expires = undefined;
    
    await user.save();

    return { message: "Password reset successful" };
  }
}
