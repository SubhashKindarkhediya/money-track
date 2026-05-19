import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Mail, 
  KeyRound, 
  Lock, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";
import api from "../services/api";

type Step = "EMAIL" | "OTP" | "RESET" | "SUCCESS";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pre-fill email if passed from login screen
  useEffect(() => {
    const passedEmail = location.state?.email;
    if (passedEmail) {
      setEmail(passedEmail);
    }
  }, [location]);

  // Timer logic for OTP
  useEffect(() => {
    let timer: any;
    if (step === "OTP" && !canResend && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft, canResend]);

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent, autoOtp?: string) => {
    if (e) e.preventDefault();
    const otpString = autoOtp || otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await api.post("/auth/verify-otp", { email, otp: otpString });
      setStep("RESET");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleanedValue = value.replace(/\D/g, "");
    if (cleanedValue.length > 1) {
      const pastedData = cleanedValue.slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (i < pastedData.length) {
          newOtp[i] = pastedData[i];
        }
      }
      setOtp(newOtp);

      const focusIndex = Math.min(pastedData.length, 5);
      otpRefs.current[focusIndex]?.focus();

      if (pastedData.length === 6) {
        setTimeout(() => handleVerifyOtp(undefined, pastedData), 300);
      }
      return;
    }

    if (value.length > 1) value = value.slice(-1); // Prevent multiple chars
    if (!/^\d*$/.test(value)) return; // Only numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input or Auto-submit
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    } else if (value && index === 5) {
      // If the last digit is entered, auto verify
      const fullOtp = newOtp.join("");
      if (fullOtp.length === 6) {
         // Small delay for UI smoothness before calling API
         setTimeout(() => handleVerifyOtp(undefined, fullOtp), 300);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 0) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      if (i < pastedData.length) {
        newOtp[i] = pastedData[i];
      }
    }
    setOtp(newOtp);

    const focusIndex = Math.min(pastedData.length, 5);
    otpRefs.current[focusIndex]?.focus();

    if (pastedData.length === 6) {
      setTimeout(() => handleVerifyOtp(undefined, pastedData), 300);
    }
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent | null = null) => {
    if (e) e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await api.post("/auth/request-otp", { email });
      setStep("OTP");
      setTimeLeft(60); // Reset timer
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]); // Reset OTP inputs
    } catch (err: any) {
      console.error("Forgot Password Error:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to send OTP. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const otpString = otp.join("");
    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp: otpString, newPassword });
      setStep("SUCCESS");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex items-center justify-center p-4 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300">
      {/* Background Ornaments */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-[460px] relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2.5rem] p-5 sm:p-8 md:p-10">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-6">
              {step === "EMAIL" && <Mail size={28} />}
              {step === "OTP" && <KeyRound size={28} />}
              {step === "RESET" && <ShieldCheck size={28} />}
              {step === "SUCCESS" && <CheckCircle2 size={28} className="text-emerald-500" />}
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              {step === "EMAIL" && "Forgot Password"}
              {step === "OTP" && "Verify OTP"}
              {step === "RESET" && "New Password"}
              {step === "SUCCESS" && "Password Reset!"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {step === "EMAIL" && "Enter your email to receive a verification code."}
              {step === "OTP" && `We've sent a 6-digit code to ${email}`}
              {step === "RESET" && "Choose a strong password for your account."}
              {step === "SUCCESS" && "Your password has been updated successfully."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
              {error}
            </div>
          )}

          {/* Step 1: Email Form */}
          {step === "EMAIL" && (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium text-slate-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                />
              </div>

              <button
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    <span className="text-sm uppercase tracking-widest">SEND OTP</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP Form */}
          {step === "OTP" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="otp-box bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/5 transition-all text-lg sm:text-2xl font-bold text-center text-slate-900 dark:text-white"
                  />
                ))}
              </div>

              <div className="text-center mt-2 flex flex-col items-center justify-center gap-2">
                <button 
                  type="button"
                  onClick={() => canResend ? handleRequestOtp() : null}
                  disabled={!canResend || isLoading}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${canResend ? 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300' : 'text-slate-400 cursor-not-allowed'}`}
                >
                  Resend OTP
                </button>
                {!canResend && (
                  <span className="text-xs font-bold text-slate-500">
                    You can resend in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>

              <button
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    <span className="text-sm uppercase tracking-widest">VERIFY OTP</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 3: Reset Password Form */}
          {step === "RESET" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none">
                  <Lock size={18} />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium text-slate-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors z-10"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none">
                  <Lock size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium text-slate-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors z-10"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    <span className="text-sm uppercase tracking-widest">RESET PASSWORD</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 4: Success Message */}
          {step === "SUCCESS" && (
            <div className="text-center space-y-8">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm font-medium">
                Your password has been successfully updated. You can now login with your new credentials.
              </div>
              <button
                onClick={() => navigate("/login")}
                className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span className="text-sm uppercase tracking-widest">BACK TO LOGIN</span>
              </button>
            </div>
          )}

          {/* Footer Navigation */}
          {step !== "SUCCESS" && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <Link
                to="/login"
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest"
              >
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
