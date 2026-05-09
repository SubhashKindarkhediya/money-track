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
  Shield,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const genderOptions = ["Male", "Female", "Other"];

  // Sync with user context
  useEffect(() => {
    if (user) {
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
      });
    }
  }, [user]);

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
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to update profile.",
      });
    } finally {
      setIsLoading(false);
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
          <div className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-gray-100 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="p-2.5 rounded-2xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-colors border border-gray-100 dark:border-gray-800"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
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
          <div className="flex items-center gap-5 p-6 rounded-[1.5rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-indigo-500/20 shadow-lg shadow-indigo-900/5 dark:shadow-none">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0 bg-[#1e1a3b] p-1 flex items-center justify-center">
              <User className="text-indigo-500" size={50} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {user?.name || "User"}
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {user?.email || "-"}
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
                <span className="text-sm font-bold text-gray-900 dark:text-white">{user?.phone_number || "-"}</span>
              </div>

              <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400">
                    <Mail size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Email Address</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{user?.email || "-"}</span>
              </div>

              <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400">
                    <User size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Gender</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">{user?.gender || "-"}</span>
              </div>

              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400">
                    <Calendar size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Date of Birth</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{user?.dob || "-"}</span>
              </div>
            </div>
          </div>

          {/* 3. Address Section */}
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

          {/* 4. Account & Security */}
          <div className="rounded-[1.5rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1b2a] transition-colors mt-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] text-indigo-500 dark:text-indigo-400 shrink-0">
                <Shield size={18} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Account & Security</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Manage your account security
                </span>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400 shrink-0" />
          </div>

          </div>
        </div>
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
        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/90 backdrop-blur-2xl px-6 py-5 flex items-center gap-5 border-b border-indigo-100/50 dark:border-gray-800 z-30 shadow-sm shadow-indigo-900/5">
          <button
            onClick={handleCancel}
            className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all active:scale-95"
          >
            <X size={20} />
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
                <div className="w-32 h-32 rounded-[3rem] overflow-hidden border-4 border-indigo-50 dark:border-gray-800 shadow-xl shadow-indigo-500/10">
                  <div className="w-full h-full bg-[#1e1a3b] flex items-center justify-center">
                    <User className="text-indigo-500" size={64} />
                  </div>
                </div>
                <button
                  type="button"
                  className="absolute -bottom-2 -right-2 w-12 h-12 bg-indigo-600 text-white rounded-2xl border-4 border-white dark:border-gray-900 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <SquarePen size={20} />
                </button>
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
                  className="w-full px-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white"
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
                  className="w-full px-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white"
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
                    onChange={handleChange}
                    className="w-full pl-14 pr-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white"
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
                  className="w-full px-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 resize-none text-gray-900 dark:text-white"
                  placeholder="Your full address here..."
                />
              </div>

              {/* Gender */}
              <div className="space-y-2 relative">
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
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 font-bold uppercase text-xs text-gray-900 dark:text-white"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Fixed Bottom Button */}
        <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-40">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]"
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
