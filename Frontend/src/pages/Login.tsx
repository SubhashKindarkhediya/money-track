import { Eye, EyeOff } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  LogIn as LogInIcon,
  ChevronRight,
  Loader2,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useGoogleLogin } from "@react-oauth/google";

const FloatingInput = ({
  icon: Icon,
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete = "off",
}: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative group">
      {/* Left Icon */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none">
        <Icon size={18} />
      </div>

      {/* Input */}
      <input
        type={isPassword ? (showPassword ? "text" : "password") : type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder=" "
        required
        autoComplete={autoComplete}
        className="peer w-full pl-11 pr-12 py-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium text-slate-900 dark:text-white"
      />

      {/* 👁️ Show/Hide Button */}
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}

      {/* Label */}
      <label
        className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium transition-all duration-200 pointer-events-none
        peer-focus:-top-1 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-focus:bg-white dark:peer-focus:bg-slate-900 peer-focus:px-2
        peer-[:not(:placeholder-shown)]:-top-1 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-slate-900 peer-[:not(:placeholder-shown)]:px-2"
      >
        {label}
      </label>

    </div>
  );
};

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // OTP verification state (when user didn't verify email during signup)
  const [showOtp, setShowOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP resend countdown timer
  useEffect(() => {
    let timer: any;
    if (showOtp && !canResend && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [showOtp, timeLeft, canResend]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const finalValue = name === "email" ? value.toLowerCase() : value;
    setFormData({ ...formData, [name]: finalValue });
  };

  // ─── OTP Input Handlers ────────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    const cleanedValue = value.replace(/\D/g, "");

    // Handle paste (multiple chars)
    if (cleanedValue.length > 1) {
      const pastedData = cleanedValue.slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = i < pastedData.length ? pastedData[i] : newOtp[i];
      }
      setOtp(newOtp);
      const focusIndex = Math.min(pastedData.length, 5);
      otpRefs.current[focusIndex]?.focus();
      if (pastedData.length === 6) {
        setTimeout(() => handleVerifyOtp(undefined, pastedData), 300);
      }
      return;
    }

    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    } else if (value && index === 5) {
      const fullOtp = newOtp.join("");
      if (fullOtp.length === 6) {
        setTimeout(() => handleVerifyOtp(undefined, fullOtp), 300);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData.length) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = i < pastedData.length ? pastedData[i] : newOtp[i];
    }
    setOtp(newOtp);
    otpRefs.current[Math.min(pastedData.length, 5)]?.focus();
    if (pastedData.length === 6) {
      setTimeout(() => handleVerifyOtp(undefined, pastedData), 300);
    }
  };

  // ─── Verify OTP after login error ─────────────────────────────────────────

  const handleVerifyOtp = async (e?: React.FormEvent, autoOtp?: string) => {
    if (e) e.preventDefault();
    const otpString = autoOtp || otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setError("");
    setOtpLoading(true);
    try {
      const response = await api.post("/auth/verify-signup-otp", {
        email: pendingEmail,
        otp: otpString,
      });

      const { user, token } = response.data;

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      login(token, user);
      setTimeout(() => navigate("/"), 150);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP. Please check and try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── Resend OTP (re-triggers signup with same email to resend OTP) ─────────

  const handleResendOtp = async () => {
    setError("");
    setResendLoading(true);
    try {
      // Re-calling signup with existing email triggers OTP resend (backend handles unverified users)
      await api.post("/auth/resend-otp", { email: pendingEmail });
      setTimeLeft(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // ─── Google Login ──────────────────────────────────────────────────────────

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      setError("");
      try {
        const response = await api.post("/auth/google-login", {
          credential: tokenResponse.access_token,
          isAccessToken: true
        });

        const { user, token } = response.data;
        login(token, user);
        navigate("/");
      } catch (err: any) {
        setError(err.response?.data?.error || "Google login failed.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setError("Google Login Failed");
      setIsGoogleLoading(false);
    },
  });

  // ─── Regular Login ─────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const { user, token } = response.data;
      login(token, user);

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      setTimeout(() => navigate("/"), 150);
    } catch (err: any) {
      const errorMsg: string =
        err.response?.data?.error || "Failed to login. Please check your credentials.";

      // ✅ If email is not verified → show OTP screen automatically
      if (
        errorMsg.toLowerCase().includes("verify your email") ||
        errorMsg.toLowerCase().includes("otp was sent")
      ) {
        setPendingEmail(formData.email);
        setOtp(["", "", "", "", "", ""]);
        setTimeLeft(60);
        setCanResend(false);
        setError("");
        setShowOtp(true);
        // Focus first OTP box after render
        setTimeout(() => otpRefs.current[0]?.focus(), 300);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OTP Screen ───────────────────────────────────────────────────────────

  if (showOtp) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex items-center justify-center p-4 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300">
        {/* Background Ornaments */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="w-full max-w-[460px] relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2.5rem] p-6 md:p-8">

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-5">
                <KeyRound size={28} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Verify Your Email
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed px-2">
                An OTP was sent to <span className="font-bold text-indigo-600 dark:text-indigo-400">{pendingEmail}</span> during signup. Please enter it to continue.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                {error}
              </div>
            )}

            {/* OTP Inputs */}
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="otp-box bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/5 transition-all text-lg sm:text-2xl font-bold text-center text-slate-900 dark:text-white"
                  />
                ))}
              </div>

              {/* Resend Timer */}
              <div className="text-center flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => canResend ? handleResendOtp() : null}
                  disabled={!canResend || resendLoading}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                    canResend
                      ? "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      : "text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {resendLoading ? "Sending..." : "Resend OTP"}
                </button>
                {!canResend && (
                  <span className="text-xs font-bold text-slate-500">
                    Resend in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>

              {/* Verify Button */}
              <button
                disabled={otpLoading || otp.join("").length !== 6}
                className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {otpLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <span className="text-sm uppercase tracking-widest">Verify OTP</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowOtp(false);
                  setOtp(["", "", "", "", "", ""]);
                  setError("");
                }}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest"
              >
                <ArrowLeft size={14} />
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Login Screen ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex items-center justify-center p-4 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300">
      {/* Background Ornaments */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-[460px] relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2.5rem] p-6 md:p-8">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-6">
              <LogInIcon size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Welcome
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Please enter your details to log in.
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <FloatingInput
              icon={Mail}
              label="Email or Phone Number *"
              name="email"
              type="text"
              placeholder="email@example.com or 9876543210"
              value={formData.email}
              onChange={handleChange}
              autoComplete="off"
            />

            <div className="space-y-1">
              <FloatingInput
                icon={Lock}
                label="Password *"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <div className="flex justify-end px-1">
                <Link
                  to="/forgot-password"
                  state={{ email: formData.email }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors uppercase tracking-widest"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              disabled={isLoading || isGoogleLoading}
              className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span className="text-sm uppercase tracking-widest">
                    LOGIN
                  </span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
              <span className="px-4 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isGoogleLoading || isLoading}
            onClick={() => handleGoogleLogin()}
            className="w-full h-13 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 font-bold text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {isGoogleLoading ? (
              <Loader2 size={18} className="animate-spin text-indigo-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isGoogleLoading ? "VERIFYING..." : "GOOGLE"}
          </button>

          <p className="mt-10 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline underline-offset-4"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
