import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Save,
  ArrowLeft,
  Loader2,
  SquarePen,
  X,
  Phone,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronDown,
  Trash2,
  CreditCard,
  Pencil,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import MarqueeText from "../components/MarqueeText";
import toast from "react-hot-toast";

// Tap to copy email + auto-scroll if overflow — works on mobile & desktop
const TruncatedEmail: React.FC<{ email: string; className?: string }> = ({ email, className = "" }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      onClick={handleCopy}
      className={`relative overflow-hidden min-w-0 cursor-pointer`}
    >
      <MarqueeText 
        text={email} 
        className={`text-sm font-bold ${className}`} 
      />
      {copied && (
        <span className="absolute -top-8 right-0 bg-gray-900 dark:bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 z-50">
          ✓ Copied!
        </span>
      )}
    </div>
  );
};

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // States
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || (user?.name ? user.name.split(" ")[0] : ""),
    last_name:
      user?.last_name ||
      (user?.name ? user.name.split(" ").slice(1).join(" ") : ""),
    phone_number: user?.phone_number || "",
    gender: user?.gender || "",
    address: user?.address || "",
    dob: user?.dob || "",
    profile_picture: user?.profile_picture || "",
    upi_id: user?.upi_id || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // UPI Modal State
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [upiIdInput, setUpiIdInput] = useState("");
  const [upiSubmitLoading, setUpiSubmitLoading] = useState(false);
  const [upiError, setUpiError] = useState("");

  const genderOptions = ["Male", "Female", "Other"];

  // Sync with user context
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        first_name:
          user.first_name || (user.name ? user.name.split(" ")[0] : ""),
        last_name:
          user.last_name ||
          (user.name ? user.name.split(" ").slice(1).join(" ") : ""),
        phone_number: user.phone_number || "",
        gender: user.gender || "",
        address: user.address || "",
        dob: user.dob || "",
        profile_picture: user.profile_picture || "",
        upi_id: user.upi_id || "",
      });
    }
  }, [user]);

  // Helper to format YYYY-MM-DD to DD/MM/YYYY
  const formatDateToDDMMYYYY = (isoDate: string) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
  };

  // Helper to get today's date in local timezone YYYY-MM-DD
  const getLocalTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && typeof target.closest === "function" && !target.closest(".relative")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: "error", text: "File size should be less than 2MB" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profile_picture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setMessage(null);
    setActiveDropdown(null);
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleSelect = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    setActiveDropdown(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await api.patch("/auth/profile", formData);
      updateUser(response.data.user);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError("");
    
    if (!upiIdInput.trim()) {
      setUpiError("UPI ID is required");
      return;
    }
    
    try {
      setUpiSubmitLoading(true);
      const response = await api.patch("/auth/profile", { upi_id: upiIdInput.trim() });
      updateUser(response.data.user);
      setIsUpiModalOpen(false);
      toast.success("UPI ID updated successfully!");
    } catch (err: any) {
      setUpiError(err.response?.data?.error || "Failed to save UPI ID");
      toast.error(err.response?.data?.error || "Failed to save UPI ID");
    } finally {
      setUpiSubmitLoading(false);
    }
  };

  // ---------------------------------------------------------
  // VIEW MODE SCREEN
  // ---------------------------------------------------------
  if (!isEditing) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-white dark:bg-[#0a0a1a]">
        <div className="max-w-4xl mx-auto w-full font-sans pb-24 min-h-screen">
          {/* Header */}
          <div className="sticky top-0 z-30 flex items-center gap-4 px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
          >
            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
          </button>

          <h2 className="text-base font-black text-gray-900 dark:text-white tracking-wide">
            Profile
          </h2>

          <div className="flex-1" />

          {/* EDIT BUTTON */}
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-50/50 dark:bg-[#151624] text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-[#1e1f30] transition-all flex items-center gap-2 border border-indigo-200 dark:border-indigo-500/30 active:scale-95"
          >
            <SquarePen size={16} />
            <span>Edit</span>
          </button>
        </div>

        {/* Main Layout wrapper matching the dark aesthetic */}
        <div className="px-5 mt-4 space-y-6">

          {/* 1. Main Profile Card */}
          <div className="flex items-start gap-4 p-5 rounded-[1.5rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-indigo-500/20 shadow-lg shadow-indigo-900/5 dark:shadow-none">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0 bg-[#1e1a3b] flex items-center justify-center">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="text-indigo-500" size={28} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <MarqueeText 
                text={user?.name || "User"} 
                className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight"
              />
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tracking-widest mt-1 uppercase">
                Premium Account
              </p>
            </div>
          </div>

          {/* 2. Personal Information Section */}
          <div>
            <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3 px-2">
              Personal Information
            </h3>
            <div className="rounded-[1.5rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden">

              <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400">
                    <Phone size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Mobile Number</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{user?.phone_number || "-"}</span>
              </div>


              <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800/50">
                <div className="flex items-center gap-4 shrink-0">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400">
                    <Mail size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">Email Address</span>
                </div>
                <div className="ml-4 max-w-[45%] overflow-hidden">
                  <TruncatedEmail
                    email={user?.email || "-"}
                    className="text-gray-700 dark:text-gray-200 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400">
                    <User size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Gender</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize">{user?.gender || "-"}</span>
              </div>

              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400">
                    <Calendar size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Date of Birth</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatDateToDDMMYYYY(user?.dob || "") || "-"}</span>
              </div>
            </div>
          </div>

          {/* 3. Payment Details Section */}
          <div>
            <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3 px-2">
              Payment Details
            </h3>
            <div 
              className="rounded-[1.5rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1b2a] transition-colors"
              onClick={() => {
                setUpiIdInput(user?.upi_id || "");
                setUpiError("");
                setIsUpiModalOpen(true);
              }}
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400 mt-1 shrink-0">
                  <CreditCard size={18} />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0 w-full">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">UPI ID</span>
                  <div className="w-full overflow-hidden">
                    <MarqueeText 
                      text={user?.upi_id || "Not provided"} 
                      className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                    />
                  </div>
                </div>
              </div>
              <Pencil size={18} className="text-indigo-500 shrink-0 hover:text-indigo-600 transition-colors mt-2" />
            </div>
          </div>

          {/* 4. Address Section */}
          <div>
            <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3 px-2">
              Address
            </h3>
            <div className="rounded-[1.5rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1b2a] transition-colors">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400 mt-1 shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Permanent Address</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed">
                    {user?.address || "Not provided"}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 shrink-0" />
            </div>
          </div>


          </div>
        </div>

        {/* UPI ID Modal */}
        {isUpiModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsUpiModalOpen(false)}
            ></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-[#0a0a1a] rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-700"></div>
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl mx-auto flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                  <CreditCard size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Setup UPI ID</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Enter your UPI ID so friends can send money directly to your bank account.
                </p>
                
                <form onSubmit={handleUpiSubmit} className="space-y-4">
                  <div className="text-left">
                    <label className="text-[10px] font-black tracking-widest uppercase text-gray-400 dark:text-gray-500 block mb-2 px-1">UPI ID</label>
                    {upiError && <p className="text-red-500 text-xs font-bold mb-2 px-1">{upiError}</p>}
                    <input
                      type="text"
                      required
                      placeholder={`e.g. ${user?.phone_number || "9876543210"}@ybl`}
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsUpiModalOpen(false)}
                      className="w-1/3 h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={upiSubmitLoading}
                      className="flex-1 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black uppercase tracking-widest rounded-2xl text-xs disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20"
                    >
                      {upiSubmitLoading ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : "Save & Enable"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------
  // EDIT MODE SCREEN
  // ---------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-white dark:bg-[#0a0a1a]">
      <div className="max-w-4xl mx-auto w-full bg-white/60 backdrop-blur-3xl dark:bg-gray-800/50 animate-in slide-in-from-bottom-10 duration-500 font-sans transition-colors duration-300 shadow-2xl shadow-indigo-900/5 sm:border-x border-indigo-50 dark:border-gray-800 min-h-screen">
        {/* Edit Header */}
        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/90 backdrop-blur-2xl px-4 py-5 flex items-center gap-4 border-b border-indigo-100/50 dark:border-gray-800 z-30 shadow-sm shadow-indigo-900/5">
          <button
            onClick={handleCancel}
            className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all active:scale-95"
          >
            <X size={22} />
          </button>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            Update Profile
          </h2>
        </div>

        <div className="px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-50 dark:border-gray-800 shadow-xl shadow-indigo-500/10 bg-[#1e1a3b]">
                  {formData.profile_picture ? (
                    <img src={formData.profile_picture} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="text-indigo-500" size={64} />
                    </div>
                  )}
                </div>

                {/* Remove Photo Button */}
                {formData.profile_picture && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, profile_picture: "" })}
                    className="absolute -top-1 -left-1 w-10 h-10 bg-rose-500 text-white rounded-2xl border-4 border-white dark:border-gray-900 flex items-center justify-center shadow-lg hover:scale-110 hover:bg-rose-600 transition-all active:scale-95 z-10"
                    title="Remove Photo"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white rounded-2xl border-4 border-white dark:border-gray-900 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                  <SquarePen size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="mt-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Change Photo
              </p>
            </div>

            {message && (
              <div
                className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm animate-in zoom-in-95 duration-300 ${message.type === "success"
                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                  : "bg-red-500/10 text-red-600 border border-red-500/20"
                  }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${message.type === "success" ? "bg-green-600" : "bg-red-600"}`}
                ></div>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              {/* First Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                />
              </div>

              {/* Email Address (Read Only) */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                  Email Address (Cannot be changed)
                </label>
                <div className="relative group">
                  <Mail
                    size={18}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-14 pr-5 py-4 bg-gray-100 dark:bg-gray-800/30 border border-indigo-100/50 dark:border-gray-700 rounded-2xl font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* UPI ID */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                  UPI ID
                </label>
                <div className="relative group">
                  <CreditCard
                    size={18}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  />
                  <input
                    type="text"
                    name="upi_id"
                    value={formData.upi_id}
                    onChange={handleChange}
                    placeholder="e.g. 9876543210@ybl"
                    className="w-full pl-14 pr-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                  Phone Number
                </label>
                <div className="relative group">
                  <Phone
                    size={18}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  />
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) {
                        setFormData({ ...formData, phone_number: val });
                      }
                    }}
                    maxLength={10}
                    className="w-full pl-14 pr-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                  Permanent Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 resize-none text-gray-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                  placeholder="Your full address here..."
                />
              </div>

              {/* Gender */}
              <div className={`space-y-2 relative ${activeDropdown === "gender" ? "z-30" : "z-10"}`}>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                  Gender
                </label>
                <div
                  onClick={() => toggleDropdown("gender")}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-all group"
                >
                  <span className={`font-bold ${formData.gender ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                    {formData.gender || "Select Gender"}
                  </span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${activeDropdown === "gender" ? "rotate-180 text-indigo-500" : ""}`} />
                </div>

                {activeDropdown === "gender" && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-[#1a1b2e] border border-indigo-100 dark:border-indigo-500/20 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {genderOptions.map((opt) => (
                      <div
                        key={opt}
                        onClick={() => handleSelect("gender", opt)}
                        className="px-5 py-3.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        {opt}
                        {formData.gender === opt && <Check size={16} className="text-indigo-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                  Date of Birth
                </label>
                <div className="relative">
                  {/* Visible Formatted Text Input */}
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formatDateToDDMMYYYY(formData.dob)}
                    readOnly
                    className="w-full pl-5 pr-12 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 font-bold uppercase text-xs text-gray-900 dark:text-white transition-all cursor-pointer placeholder:transition-opacity focus:placeholder:opacity-0"
                  />
                  
                  {/* Invisible Native Date Picker */}
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    max={getLocalTodayString()}
                    onChange={handleChange}
                    onClick={(e) => {
                      try {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          e.currentTarget.showPicker();
                        } else {
                          e.currentTarget.focus();
                        }
                      } catch (err) {
                        console.warn("Failed to open date picker", err);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-[0.01] cursor-pointer z-10"
                  />
                  
                  <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Fixed Bottom Button */}
        <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-40">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Save size={18} />
                <span className="uppercase tracking-[0.1em] text-sm font-bold">
                  Update Profile
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
