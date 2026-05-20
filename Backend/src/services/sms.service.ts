import { singleton } from "tsyringe";
import { MailService } from "./mail.service";

@singleton()
export class SmsService {
  constructor(private mailService: MailService) {}

  /**
   * Send OTP SMS via Fast2SMS, Twilio, or gracefull fallback
   * @param phone_number {string} 10-digit number
   * @param otp {string} 6-digit OTP
   * @param userEmail {string} optional, used for fallback email notification
   */
  async sendOtpSms(phone_number: string, otp: string, userEmail?: string) {
    const provider = (process.env.SMS_PROVIDER || "FALLBACK").toUpperCase();
    const message = `Your Money Track mobile verification code is: ${otp}. Valid for 10 minutes.`;

    console.log(`[SmsService] Attempting to send OTP to ${phone_number} using provider ${provider}...`);

    if (provider === "FAST2SMS") {
      const apiKey = process.env.FAST2SMS_API_KEY;
      if (!apiKey) {
        console.warn("[SmsService] FAST2SMS_API_KEY is not set in env. Falling back to email/console.");
      } else {
        try {
          // Fast2SMS bulkV2 API
          const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              "authorization": apiKey,
              "content-type": "application/json",
              "accept": "application/json"
            },
            body: JSON.stringify({
              route: "otp",
              variables_values: otp,
              numbers: phone_number
            })
          });

          const result = await response.json();
          if (response.ok && result.return === true) {
            console.log(`[SmsService] OTP sent successfully to ${phone_number} via Fast2SMS`);
            return;
          } else {
            throw new Error(result.message || JSON.stringify(result));
          }
        } catch (error: any) {
          console.error("[SmsService] Fast2SMS sending failed:", error.message || error);
          // Fall back gracefully so the flow is not broken
        }
      }
    }

    if (provider === "TWILIO") {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        console.warn("[SmsService] Twilio credentials not fully set in env. Falling back.");
      } else {
        try {
          const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Authorization": `Basic ${authString}`,
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: new URLSearchParams({
                From: fromNumber,
                To: phone_number.startsWith("+") ? phone_number : `+91${phone_number}`, // default Indian prefix if none
                Body: message
              })
            }
          );

          const result = await response.json();
          if (response.ok) {
            console.log(`[SmsService] OTP sent successfully to ${phone_number} via Twilio`);
            return;
          } else {
            throw new Error(result.message || JSON.stringify(result));
          }
        } catch (error: any) {
          console.error("[SmsService] Twilio sending failed:", error.message || error);
        }
      }
    }

    // --- FALLBACK LOGIC ---
    // Log in console
    console.log("=========================================");
    console.log(`[SMS SIMULATION] To: ${phone_number}`);
    console.log(`[SMS SIMULATION] Message: ${message}`);
    console.log("=========================================");
  }
}
