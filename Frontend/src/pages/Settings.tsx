import React, { useState } from "react";
import { 
  ArrowLeft, Loader2, Settings, Lock, Download, KeyRound, IndianRupee, DollarSign, Euro, FileDown,
  Shield, ChevronDown, Check, X, ChevronRight, Info, Trash2, Bell, ShieldAlert, Share2, Eye, EyeOff, LockKeyhole, AlertTriangle,
  Code, Mail, ShieldCheck, FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

type ViewType = "main" | "preferences" | "security" | "data" | "info";

const SettingsPage: React.FC = () => {
  const { user, updateUser, currencySymbol, logout } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<ViewType>("main");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Preference Form States
  const [prefData, setPrefData] = useState({
    currency: user?.currency || "INR",
    monthly_budget: user?.monthly_budget || "",
  });

  // Password Form States
  const [passData, setPassData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  const passwordRequirements = {
    minChars: passData.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(passData.newPassword),
    lowercase: /[a-z]/.test(passData.newPassword),
    number: /[0-9]/.test(passData.newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(passData.newPassword),
  };

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; } | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const currencyOptions = [
    { code: "INR", symbol: "₹" },
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
  ];

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    try {
      const res = await api.patch("/auth/profile", {
        currency: prefData.currency,
        monthly_budget: prefData.monthly_budget === "" ? null : Number(prefData.monthly_budget)
      });
      updateUser(res.data.user);
      showMessage("success", "Preferences updated successfully!");
    } catch (err: any) {
      showMessage("error", err.response?.data?.error || "Failed to update preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      showMessage("error", "Passwords do not match");
      return;
    }

    if (passData.currentPassword === passData.newPassword) {
      showMessage("error", "New password must be different from current password");
      return;
    }
    
    setIsLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      showMessage("success", "Password changed successfully!");
      setPassData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      showMessage("error", err.response?.data?.error || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await api.delete("/auth/delete-account");
      logout();
      navigate("/");
    } catch (err: any) {
      showMessage("error", err.response?.data?.error || "Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/transactions/export/pdf", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `MoneyTrack_History_${new Date().toLocaleDateString()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showMessage("success", "History exported successfully!");
    } catch (err) {
      showMessage("error", "Failed to export history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (view !== "main") {
      setView("main");
    } else {
      navigate("/");
    }
  };

  const SettingItem = ({ icon: Icon, label, onClick, color = "text-gray-700 dark:text-gray-200", subtext, hideArrow = false, isExpanded = false, hideBorder = false }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between py-5 ${hideBorder ? '' : 'border-b border-indigo-50/50 dark:border-gray-800/50'} active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors group px-1`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl ${color === "text-rose-600" ? "bg-rose-50 dark:bg-rose-500/10" : "bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"}`}>
          <Icon size={20} className={color === "text-rose-600" ? "text-rose-600" : ""} />
        </div>
        <div className="text-left">
          <p className={`text-base font-bold ${color}`}>{label}</p>
          {subtext && <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">{subtext}</p>}
        </div>
      </div>
      {!hideArrow && <ChevronRight size={18} className={`text-gray-300 dark:text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-1'}`} />}
    </button>
  );
  const RequirementItem = ({ label, met }: { label: string; met: boolean }) => (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${met ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-300 dark:border-gray-600'}`}>
        {met ? <Check size={12} className="text-white" /> : <X size={12} className="text-gray-300 dark:text-gray-600" />}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${met ? 'text-green-600 dark:text-green-500' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
  return (
    <div className="max-w-xl mx-auto w-full font-sans pb-24 animate-in slide-in-from-bottom-6 duration-300 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 px-6 py-5 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-6">
        <button
          onClick={handleBack}
          type="button"
          className="p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700 active:scale-95"
        >
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">
            {view === "main" ? "Settings" : view === "preferences" ? "Financial Preferences" : view === "security" ? "Security" : view === "data" ? "Data Management" : "App Info"}
          </h1>
          {view === "info" && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">Version 1.0.0 (Beta)</span>
          )}
        </div>
      </div>

      <div className="px-6">
        {/* Message Banner (Global, except Security and Delete Confirm) */}
        {message && view !== "security" && !showDeleteConfirm && (
          <div className={`mt-6 p-4 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2 flex items-center gap-3 ${
            message.type === "success" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${message.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
            {message.text}
          </div>
        )}

        {view === "main" ? (
          <div className="mt-4 animate-in fade-in duration-500">
            <SettingItem 
              icon={Lock} 
              label="Change Password" 
              onClick={() => setView("security")} 
            />
            <SettingItem 
              icon={IndianRupee} 
              label="Financial Preferences" 
              subtext={`${prefData.currency} • Budget: ${prefData.monthly_budget || 'None'}`}
              onClick={() => setView("preferences")} 
            />
            <SettingItem 
              icon={FileDown} 
              label="Data & Export" 
              onClick={() => setView("data")} 
            />
            <SettingItem 
              icon={Share2} 
              label="Share Us" 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Money Track',
                    text: 'Manage your finances with Money Track!',
                    url: window.location.origin,
                  }).catch(console.error);
                } else {
                  // Fallback: Copy link
                  navigator.clipboard.writeText(window.location.origin);
                  showMessage("success", "App link copied to clipboard!");
                }
              }} 
            />
            <SettingItem 
              icon={Info} 
              label="App Info" 
              onClick={() => setView("info")} 
            />
            <SettingItem 
              icon={Trash2} 
              label="Delete Account" 
              color="text-rose-600"
              onClick={() => setShowDeleteConfirm(true)} 
            />
          </div>
        ) : (
          <div className={`space-y-6 ${view === "info" ? "mt-2" : "mt-8"}`}>
            {view === "info" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 w-full">
                    <SettingItem 
                      icon={Code} 
                      label="Developed by" 
                      subtext="Money Track Team" 
                      onClick={() => {}} 
                      hideArrow={true}
                    />
                    <SettingItem 
                      icon={Mail} 
                      label="Contact Support" 
                      subtext="moneytrack254@gmail.com" 
                      onClick={() => {
                        window.location.href = "mailto:moneytrack254@gmail.com";
                      }} 
                      hideArrow={true}
                    />
                    <div>
                      <SettingItem 
                        icon={ShieldCheck} 
                        label="Privacy Policy" 
                        subtext="Read our data policies" 
                        onClick={() => setActiveDropdown(activeDropdown === 'privacy' ? null : 'privacy')}
                        isExpanded={activeDropdown === 'privacy'}
                        hideBorder={activeDropdown === 'privacy'}
                      />
                      {activeDropdown === 'privacy' && (
                        <div className="p-5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1b2e] rounded-b-2xl border-b border-indigo-50/50 dark:border-gray-800/50 animate-in slide-in-from-top-2 duration-300 mb-2">
                           <ul className="list-disc pl-4 space-y-3 text-left">
                             <li><strong className="text-gray-700 dark:text-gray-300">Data Collection:</strong> We collect basic info (name, email, transactions) to provide our service.</li>
                             <li><strong className="text-gray-700 dark:text-gray-300">Data Usage:</strong> Your data is used solely to generate your personal financial analytics.</li>
                             <li><strong className="text-gray-700 dark:text-gray-300">Data Security:</strong> We use industry-standard encryption to keep your data 100% safe.</li>
                             <li><strong className="text-gray-700 dark:text-gray-300">No Third-Party Sharing:</strong> We do not sell or share your data with advertisers or third parties.</li>
                             <li><strong className="text-gray-700 dark:text-gray-300">Your Rights:</strong> You can export or completely delete your account data at any time.</li>
                           </ul>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <SettingItem 
                        icon={FileText} 
                        label="Terms of Service" 
                        subtext="App usage terms" 
                        onClick={() => setActiveDropdown(activeDropdown === 'terms' ? null : 'terms')}
                        isExpanded={activeDropdown === 'terms'}
                        hideBorder={activeDropdown === 'terms'}
                      />
                      {activeDropdown === 'terms' && (
                        <div className="p-5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1b2e] rounded-b-2xl border-b border-indigo-50/50 dark:border-gray-800/50 animate-in slide-in-from-top-2 duration-300 mb-2">
                           <ul className="list-disc pl-4 space-y-3 text-left">
                             <li><strong className="text-gray-700 dark:text-gray-300">Acceptance:</strong> By using Money Track, you agree to these app rules.</li>
                             <li><strong className="text-gray-700 dark:text-gray-300">Data Accuracy:</strong> You are responsible for the accuracy of your financial input. We are not financial advisors.</li>
                             <li><strong className="text-gray-700 dark:text-gray-300">User Responsibility:</strong> Please keep your login credentials secure. Misuse of the app is prohibited.</li>
                             <li><strong className="text-gray-700 dark:text-gray-300">Account Termination:</strong> We reserve the right to suspend accounts engaged in unauthorized activities.</li>
                           </ul>
                        </div>
                      )}
                    </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-12 mb-8 text-center">© 2026 Money Track. All rights reserved.</p>
              </div>
            )}
            {view === "preferences" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-6">
                  {/* Currency Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                      Default Currency
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === "currency" ? null : "currency")}
                        className="w-full flex items-center justify-between px-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            {prefData.currency === "INR" ? <IndianRupee size={18} /> : prefData.currency === "USD" ? <DollarSign size={18} /> : <Euro size={18} />}
                          </div>
                          <span className="font-bold">{currencyOptions.find(o => o.code === prefData.currency)?.code} ({currencyOptions.find(o => o.code === prefData.currency)?.symbol})</span>
                        </div>
                        <ChevronDown size={18} className={`text-gray-400 transition-transform ${activeDropdown === "currency" ? "rotate-180" : ""}`} />
                      </button>

                      {activeDropdown === "currency" && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-[#1e1f30] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                          {currencyOptions.map((opt) => (
                            <button
                              key={opt.code}
                              onClick={() => {
                                setPrefData({ ...prefData, currency: opt.code });
                                setActiveDropdown(null);
                              }}
                              className={`w-full flex items-center justify-between p-4 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                prefData.currency === opt.code ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5" : "text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {opt.code === "INR" ? <IndianRupee size={14} /> : opt.code === "USD" ? <DollarSign size={14} /> : <Euro size={14} />}
                                <span>{opt.code}</span>
                              </div>
                              {prefData.currency === opt.code && <Check size={16} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly Budget */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 ml-1">
                      Monthly Budget Target
                    </label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                        <IndianRupee size={18} />
                      </div>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={prefData.monthly_budget}
                        onChange={(e) => setPrefData({ ...prefData, monthly_budget: e.target.value })}
                        className="w-full pl-14 pr-5 py-4 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-2xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all shadow-inner shadow-indigo-900/5 text-gray-900 dark:text-white placeholder:transition-opacity focus:placeholder:opacity-0"
                      />
                    </div>
                  </div>

                  {/* Fixed Bottom Action Area */}
                  <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-40">
                    <div className="max-w-xl mx-auto">
                      <button
                        onClick={handleUpdatePreferences}
                        disabled={isLoading}
                        className="w-full h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                      >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                          <>
                            <Check size={22} />
                            <span className="uppercase tracking-widest text-sm">Save Preferences</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Spacer for bottom button */}
                  <div className="h-32"></div>
                </div>
              </div>
            )}

            {view === "security" && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 pb-32">
                {/* Logo & Title */}
                <div className="flex flex-col items-center text-center mt-4 mb-10">
                  <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-6">
                    <LockKeyhole size={40} className="text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Change Password</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium px-8 leading-relaxed">
                    Enter new password make sure this password is different from the previous password.
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-8 px-2">
                  {/* Local Message Banner for Security View */}
                  {message && view === "security" && (
                    <div className={`p-4 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2 flex items-center gap-3 ${
                      message.type === "success" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${message.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {message.text}
                    </div>
                  )}

                  {/* Current Password */}
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPass.current ? "text" : "password"}
                      required
                      placeholder=" "
                      value={passData.currentPassword}
                      onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                      className="peer w-full pl-14 pr-14 py-5 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-3xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all text-gray-900 dark:text-white shadow-sm"
                    />
                    <label className="absolute left-14 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-medium transition-all duration-200 pointer-events-none
                      peer-focus:-top-1 peer-focus:left-6 peer-focus:text-[10px] peer-focus:font-black peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-focus:bg-white dark:peer-focus:bg-[#0a0a1a] peer-focus:px-2
                      peer-[:not(:placeholder-shown)]:-top-1 peer-[:not(:placeholder-shown)]:left-6 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-[#0a0a1a] peer-[:not(:placeholder-shown)]:px-2">
                      Current Password*
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      {showPass.current ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {/* New Password */}
                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none">
                        <Lock size={20} />
                      </div>
                      <input
                        type={showPass.new ? "text" : "password"}
                        required
                        placeholder=" "
                        value={passData.newPassword}
                        onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                        className="peer w-full pl-14 pr-14 py-5 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-3xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all text-gray-900 dark:text-white shadow-sm"
                      />
                      <label className="absolute left-14 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-medium transition-all duration-200 pointer-events-none
                        peer-focus:-top-1 peer-focus:left-6 peer-focus:text-[10px] peer-focus:font-black peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-focus:bg-white dark:peer-focus:bg-[#0a0a1a] peer-focus:px-2
                        peer-[:not(:placeholder-shown)]:-top-1 peer-[:not(:placeholder-shown)]:left-6 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-[#0a0a1a] peer-[:not(:placeholder-shown)]:px-2">
                        New Password*
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {showPass.new ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none">
                        <Lock size={20} />
                      </div>
                      <input
                        type={showPass.new ? "text" : "password"}
                        required
                        placeholder=" "
                        value={passData.confirmPassword}
                        onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                        className="peer w-full pl-14 pr-14 py-5 bg-white/80 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700 rounded-3xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all text-gray-900 dark:text-white shadow-sm"
                      />
                      <label className="absolute left-14 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-medium transition-all duration-200 pointer-events-none
                        peer-focus:-top-1 peer-focus:left-6 peer-focus:text-[10px] peer-focus:font-black peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-focus:bg-white dark:peer-focus:bg-[#0a0a1a] peer-focus:px-2
                        peer-[:not(:placeholder-shown)]:-top-1 peer-[:not(:placeholder-shown)]:left-6 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-[#0a0a1a] peer-[:not(:placeholder-shown)]:px-2">
                        Confirm Password*
                      </label>
                    </div>
                  </div>

                  {/* Fixed Bottom Action Area */}
                  <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-40">
                    <div className="max-w-xl mx-auto">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                      >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                          <span className="uppercase tracking-widest text-sm">Update Password</span>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {view === "data" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-8">
                  <div className="bg-white/80 dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-gray-800 shadow-sm">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                      <FileDown size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Export Data</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                      Download a complete record of your financial history in PDF format. This report includes all credits, debits, and transaction details.
                    </p>
                  </div>

                  {/* Fixed Bottom Action Area */}
                  <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-40">
                    <div className="max-w-xl mx-auto">
                      <button
                        onClick={handleExportPDF}
                        disabled={isLoading}
                        className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                      >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                          <>
                            <FileDown size={22} />
                            <span className="uppercase tracking-widest text-sm">Download PDF Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {/* Spacer for bottom button */}
                  <div className="h-32"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Delete Account Confirmation Drawer */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowDeleteConfirm(false)}
          />
          
          {/* Drawer */}
          <div className="relative w-full max-w-xl bg-white dark:bg-[#0f1025] rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-300 border-t border-gray-100 dark:border-gray-800">
            {/* Handle Bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full" />
            
            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-600 mb-6">
                <AlertTriangle size={40} />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Delete Account?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8 max-w-[280px]">
                This action is <span className="text-rose-600 font-bold">permanent</span>. All your transactions, contacts, and settings will be wiped forever.
              </p>

              {/* Local Message Banner for Delete Account Drawer (Top) */}
              {message && showDeleteConfirm && (
                <div className={`w-full mb-6 p-4 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2 flex items-center gap-3 ${
                  message.type === "success" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${message.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {message.text}
                </div>
              )}
              


              <div className="w-full flex flex-row gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-16 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-black rounded-2xl transition-all flex items-center justify-center active:scale-[0.98]"
                >
                  <span className="uppercase tracking-widest text-xs">Cancel</span>
                </button>

                <button
                  onClick={handleDeleteAccount}
                  disabled={isLoading}
                  className="flex-[1.5] h-16 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      <Trash2 size={16} />
                      <span className="uppercase tracking-widest text-xs">Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
