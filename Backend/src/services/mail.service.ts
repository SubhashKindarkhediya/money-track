import nodemailer from "nodemailer";
import { singleton } from "tsyringe";

@singleton()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Send OTP Email
   */
  async sendOtpEmail(to: string, otp: string) {
    const mailOptions = {
      from: `"Money Track Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Password Reset OTP - Money Track",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">Money Track</h2>
          <p>Hi,</p>
          <p>You requested to reset your password. Use the OTP below to verify your account:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2024 Money Track Application. All rights reserved.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`OTP sent to ${to}`);
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send OTP email. Please check your email configuration.");
    }
  }
}
