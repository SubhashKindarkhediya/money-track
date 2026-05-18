import nodemailer from "nodemailer";
import dns from "dns";

// Force IPv4 resolution (Fix for Render ENETUNREACH error on IPv6)
dns.setDefaultResultOrder("ipv4first");
import { singleton } from "tsyringe";

@singleton()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      family: 4, // Force IPv4 resolution to prevent ENETUNREACH on IPv6-unsupported hosts
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    } as nodemailer.TransportOptions);
  }

  /**
   * Send OTP Email
   */
  async sendOtpEmail(to: string, otp: string) {
    const emailUser = process.env.EMAIL_USER;
    const brevoApiKey = process.env.BREVO_API_KEY;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">Money Track</h2>
          <p>Hi,</p>
          <p>Use the OTP below to verify your account:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center;">&copy; 2024 Money Track Application. All rights reserved.</p>
        </div>
    `;

    // 1. If Brevo API Key is configured, use Brevo HTTP REST API (Recommended for live Render deployment)
    if (brevoApiKey) {
      console.log(`[MailService] Attempting to send OTP email via Brevo REST API to ${to}...`);
      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": brevoApiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sender: {
              name: "Money Track Support",
              email: emailUser || "kindarkhediyasubhash254@gmail.com"
            },
            to: [{ email: to }],
            subject: "OTP Verification - Money Track",
            htmlContent: htmlContent
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(JSON.stringify(errorData) || `HTTP error! status: ${response.status}`);
        }

        console.log(`[MailService] OTP sent successfully to ${to} via Brevo HTTP API`);
        return;
      } catch (error: any) {
        console.error("[MailService] Failed to send email via Brevo HTTP API:", error);
        throw new Error("Failed to send OTP email via Brevo API. Please check your Brevo configuration.");
      }
    }

    // 2. Fallback to standard Nodemailer SMTP (Works fine in local, blocked on Render Free Tier)
    console.log(`[MailService] Brevo API Key not found. Falling back to Gmail SMTP for ${to}...`);
    const mailOptions = {
      from: `"Money Track Support" <${emailUser}>`,
      to,
      subject: "OTP Verification - Money Track",
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[MailService] OTP sent to ${to} via Gmail SMTP`);
    } catch (error) {
      console.error("[MailService] Error sending email via SMTP:", error);
      throw new Error("Failed to send OTP email. Please check your email configuration.");
    }
  }
}
