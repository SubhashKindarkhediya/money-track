import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  UserPlus,
  ChevronRight,
  Loader2,
  Phone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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

      {/* Placeholder helper */}
      <span className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-sm pointer-events-none opacity-0 peer-focus:opacity-100 peer-[:not(:placeholder-shown)]:opacity-0 transition-opacity duration-200 delay-75">
        {placeholder}
      </span>
    </div>
  );
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone_number") {
      // only digits + max 10
      const cleanedValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: cleanedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    // setFormData({ ...formData, [e.target.name]: e.target.value });
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
      navigate("/login");
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to register. Please try again.",
      );
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
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none rounded-[2.5rem] p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-6">
              <UserPlus size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Create Account
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Join us to manage your finances smarter.
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
              className="w-full h-14 mt-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-70 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
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

          <p className="mt-10 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline underline-offset-4"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
