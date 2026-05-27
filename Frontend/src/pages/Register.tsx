import { Eye, EyeOff } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  UserPlus,
  ChevronRight,
  Loader2,
  Phone,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

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
        maxLength={name === "phone_number" ? 10 : undefined}
        inputMode={name === "phone_number" ? "numeric" : undefined}
        pattern={name === "phone_number" ? "[0-9]*" : undefined}
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
        peer-[:not(:placeholder-shown)]:-top-1 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-slate-900 peer-[:not(:placeholder-shown)]:px-2
      "
      >
        {label}
      </label>

    </div>
  );
};

type Step = "FORM" | "OTP";

const Register: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("FORM");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer logic for OTP resend
  useEffect(() => {
    let timer: any;
    if (step === "OTP" && !canResend && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft, canResend]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone_number") {
      // only digits + max 10
      const cleanedValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: cleanedValue });
    } else if (name === "email") {
      setFormData({ ...formData, [name]: value.toLowerCase() });
    } else {
      setFormData({ ...formData, [name]: value });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.phone_number.length !== 10) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/signup", formData);
      setStep("OTP");
      setTimeLeft(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to register. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setIsLoading(true);
    try {
      await api.post("/auth/signup", formData);
      setTimeLeft(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
      const response = await api.post("/auth/verify-signup-otp", {
        email: formData.email,
        otp: otpString,
      });

      const { user, token } = response.data;

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      login(token, user);

      setTimeout(() => {
        navigate("/");
      }, 150);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP. Please check and try again.");
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

      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2.5rem] p-5 sm:p-6 md:p-8">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-6">
              {step === "FORM" ? <UserPlus size={28} /> : <KeyRound size={28} />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              {step === "FORM" ? "Create Account" : "Verify OTP"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {step === "FORM"
                ? "Join us to manage your finances smarter."
                : `We've sent a 6-digit code to ${formData.email}`}
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
              {error}
            </div>
          )}

          {step === "FORM" ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <FloatingInput
                icon={User}
                label="First Name *"
                name="first_name"
                placeholder="e.g. John"
                value={formData.first_name}
                onChange={handleChange}
              />

              <FloatingInput
                icon={User}
                label="Last Name *"
                name="last_name"
                placeholder="e.g. Doe"
                value={formData.last_name}
                onChange={handleChange}
              />

              <FloatingInput
                icon={Mail}
                label="Email Address *"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="off"
              />

              <FloatingInput
                icon={Phone}
                label="Mobile Number *"
                name="phone_number"
                type="tel"
                placeholder="+91 00000 00000"
                value={formData.phone_number}
                onChange={handleChange}
                autoComplete="off"
              />

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

              <FloatingInput
                icon={Lock}
                label="Confirm Password *"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />

              <button
                disabled={isLoading}
                className="w-full h-14 mt-4 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <span className="text-sm uppercase tracking-widest">
                      Register Now
                    </span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
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
                  onClick={() => (canResend ? handleResendOtp() : null)}
                  disabled={!canResend || isLoading}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                    canResend
                      ? "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                      : "text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Resend OTP
                </button>
                {!canResend && (
                  <span className="text-xs font-bold text-slate-500">
                    You can resend in {Math.floor(timeLeft / 60)}:
                    {(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>

              <button
                disabled={isLoading || otp.join("").length !== 6}
                className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <span className="text-sm uppercase tracking-widest">
                      VERIFY OTP
                    </span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {step === "FORM" ? (
            <p className="mt-10 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline underline-offset-4"
              >
                Log In
              </Link>
            </p>
          ) : (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button
                type="button"
                onClick={() => setStep("FORM")}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest"
              >
                <ArrowLeft size={14} />
                Back to Register
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
