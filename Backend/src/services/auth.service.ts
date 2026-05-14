import { singleton } from "tsyringe";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import Person from "../models/person.model";

@singleton()
export class AuthService {
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
   * Update user profile
   * @param userId {string}
   * @param data { name, phone_number, gender, address, first_name, last_name, dob, id_card_no }
   */
  async updateProfile(userId: string, data: any) {
    const { 
      name, phone_number, gender, address, 
      first_name, last_name, dob, id_card_no 
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
    
    await user.save();

    const userResponse = user.toJSON();
    delete (userResponse as any).password;
    delete (userResponse as any).confirmPassword;

    return userResponse;
  }
}
