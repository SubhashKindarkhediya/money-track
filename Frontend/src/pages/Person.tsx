import React, { useState, useEffect } from "react";
import {
  Search, User, Phone, ArrowLeft, UserPlus, Users,
  StickyNote, Loader2, Calendar, MessageSquare,
  TrendingUp, TrendingDown, IndianRupee, MoreVertical, Clock, PlusCircle, Trash2, SquarePen, X, CheckCircle2, ChevronRight, Eye
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import MarqueeText from "../components/MarqueeText";

interface Person {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  totalCredit?: number;
  totalDebit?: number;
  linked_user_id?: string;
  connection_status?: "none" | "requested" | "connected";
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reason?: string;
  note?: string;
  date: string;
  status: "pending" | "completed";
  createdAt: string;
}

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
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10 pointer-events-none">
        <Icon size={18} />
      </div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder=" "
        required={name !== "notes"}
        autoComplete={autoComplete}
        maxLength={name === "phone_number" ? 10 : undefined}
        inputMode={name === "phone_number" ? "numeric" : undefined}
        pattern={name === "phone_number" ? "[0-9]*" : undefined}
        className="peer w-full pl-11 pr-4 py-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium text-slate-900 dark:text-white"
      />
      <label
        className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium transition-all duration-200 pointer-events-none
        peer-focus:-top-1 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-black peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 peer-focus:bg-white dark:peer-focus:bg-[#0a0a1a] peer-focus:px-2
        peer-[:not(:placeholder-shown)]:-top-1 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-[#0a0a1a] peer-[:not(:placeholder-shown)]:px-2
      "
      >
        {label}
      </label>
    </div>
  );
};



// ─── Info Row (reusable for detail screen) ───────────────────────────────────
const InfoRow = ({
  icon: Icon,
  label,
  value,
  iconColor = "text-indigo-500 dark:text-indigo-400",
  last = false,
}: {
  icon: any;
  label: string;
  value?: string;
  iconColor?: string;
  last?: boolean;
}) => (
  <div className={`flex items-center justify-between p-5 ${!last ? "border-b border-gray-50 dark:border-gray-800/50" : ""}`}>
    <div className="flex items-center gap-4 shrink-0">
      <div className={`p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c2e] ${iconColor}`}>
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
    </div>
    <MarqueeText
      text={value || "—"}
      containerClassName="max-w-[55%] justify-end"
      className="text-sm font-bold text-gray-900 dark:text-white"
    />
  </div>
);

const Person: React.FC = () => {
  const navigate = useNavigate();
  const [isContactPickerSupported, setIsContactPickerSupported] = useState(false);

  useEffect(() => {
    setIsContactPickerSupported("contacts" in navigator && "ContactsManager" in window);
  }, []);

  const handleImportContact = async () => {
    try {
      const props = ["name", "tel"];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);
      
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const fullName = contact.name && contact.name[0] ? contact.name[0] : "";
        const rawPhone = contact.tel && contact.tel[0] ? contact.tel[0] : "";
        
        // Clean phone number: remove all non-digits, keep last 10 digits
        const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
        
        // Split Name into First Name & Last Name
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        
        setFormData(prev => ({
          ...prev,
          first_name: firstName,
          last_name: lastName,
          phone_number: cleanPhone
        }));
      }
    } catch (error: any) {
      console.error("Contact picker error:", error);
      if (error.name !== "AbortError") {
        alert("Failed to pick contact: " + error.message);
      }
    }
  };
  const { user, currencySymbol } = useAuth();
  const location = useLocation();
  const [persons, setPersons] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add Mode State
  const isAdding = location.pathname === "/person/add";
  const [formData, setFormData] = useState({ first_name: "", last_name: "", phone_number: "", notes: "" });
  const [submitLoading, setSubmitLoading] = useState(false);

  const { id } = useParams();
  // Detail View State
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Transaction States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"profile" | "transactions" | "edit">("profile");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed">("pending");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", notes: "" });
  const [txSearch, setTxSearch] = useState("");
  const [showTxSearch, setShowTxSearch] = useState(false);
  const [activeTxMenuId, setActiveTxMenuId] = useState<string | null>(null);
  const [justAddedPerson, setJustAddedPerson] = useState<{ name: string; phone: string } | null>(null);

  const handleInvite = (method: "whatsapp" | "sms") => {
    if (!justAddedPerson) return;
    
    const { name, phone } = justAddedPerson;
    const appUrl = window.location.origin;
    const userName = user?.name || "Money Track";
    const msg = `Hey ${name}! Maine aapko apne Money Track app par add kiya hai taaki hum humare aapsi transactions (len-den/hisab-kitab) ko aasaani aur transparency se track kar sakein. Aap yahan balances check kar sakte hain: ${appUrl} - Regards, ${userName}`;
    
    if (method === "whatsapp") {
      const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, "_blank");
    } else {
      const smsUrl = navigator.userAgent.match(/iPhone|iPad|iPod/i)
        ? `sms:${phone}&body=${encodeURIComponent(msg)}`
        : `sms:${phone}?body=${encodeURIComponent(msg)}`;
      window.open(smsUrl, "_blank");
    }
    
    // Close modal and navigate
    handleCloseInviteModal();
  };

  const handleCloseInviteModal = () => {
    setJustAddedPerson(null);
    navigate("/person");
    setFormData({ first_name: "", last_name: "", phone_number: "", notes: "" });
    fetchPersons();
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  useEffect(() => {
    if (id && persons.length > 0) {
      const p = persons.find(person => person.id === id);
      if (p) {
        setSelectedPerson(p);

        // Use URLSearchParams to get the tab from the URL
        const params = new URLSearchParams(location.search);
        const targetTab = (params.get("tab") as any) || location.state?.tab || "profile";

        setDetailTab(targetTab);
        if (location.state?.status) {
          setStatusFilter(location.state.status);
        } else {
          setStatusFilter("pending");
        }
        if (targetTab === "transactions") {
          fetchTransactions(p.id);
        }
      }
    } else if (!id) {
      setSelectedPerson(null);
    }
  }, [id, persons, location.search, location.state]);

  const fetchPersons = async () => {
    try {
      setLoading(true);
      const res = await api.get("/person");
      setPersons(res.data);
    } catch (error) {
      console.error("Failed to fetch persons", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone_number") {
      const cleanedValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: cleanedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.first_name) {
      alert("Name is required");
      return;
    }

    try {
      setSubmitLoading(true);
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      await api.post("/person", {
        name: fullName,
        phone: formData.phone_number,
        notes: formData.notes,
      });
      
      // If phone number exists, show invite success dialog modal first
      if (formData.phone_number) {
        setJustAddedPerson({ name: fullName, phone: formData.phone_number });
      } else {
        navigate("/person");
        setFormData({ first_name: "", last_name: "", phone_number: "", notes: "" });
        fetchPersons();
      }
    } catch (error: any) {
      console.error("Failed to add person", error);
      alert(error.response?.data?.error || "Failed to add person. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !editForm.first_name) return;
    try {
      setSubmitLoading(true);
      const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
      const updateData = {
        name: fullName,
        phone: editForm.phone,
        notes: editForm.notes
      };
      await api.put(`/person/${selectedPerson.id}`, updateData);
      setSelectedPerson({ ...selectedPerson, ...updateData });
      fetchPersons();
      setDetailTab("profile");
      navigate(`/person/${selectedPerson.id}?tab=profile`, { replace: true });
    } catch (error) {
      console.error("Failed to update person", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (personId: string) => {
    const person = persons.find(p => p.id === personId);
    if (person) {
      const credit = person.totalCredit || 0;
      const debit = person.totalDebit || 0;

      if (credit !== 0 || debit !== 0) {
        setDeleteError("Cannot delete: Active balance exists.");
        setTimeout(() => setDeleteError(null), 3000);
        return;
      }
    }

    setIsConfirmingDelete(true);
  };

  const confirmDelete = async (personId: string) => {
    try {
      await api.delete(`/person/${personId}`);
      fetchPersons();
      setActiveMenuId(null);
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error("Failed to delete person", error);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedPerson) return;
    try {
      await api.post(`/person/${selectedPerson.id}/request`);
      setSelectedPerson(prev => prev ? { ...prev, connection_status: "requested" } : null);
      setPersons(prev => prev.map(p => p.id === selectedPerson.id ? { ...p, connection_status: "requested" } : p));
    } catch (error) {
      console.error("Failed to send request", error);
    }
  };

  const handleInviteApp = async () => {
    if (!selectedPerson) {
      alert("Person details not found.");
      return;
    }

    // Fallback name if user is not loaded
    const senderName = user?.name || "Your Friend";

    const message = `Hi ${selectedPerson.name}! 👋

I've been using *Money Track* to manage shared expenses with friends and contacts — and it's been really helpful!

We already have some transactions recorded together. Join Money Track to easily see what we owe each other, all in one place.

🔗 Get started for free:
https://moneytrackflow.vercel.app/

Takes less than a minute. See you there! 😊

— ${senderName}`;

    const shareData = {
      title: 'Money Track',
      text: message,
    };

    try {
      // 1. Try Native Share API
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }

      // 2. Try Clipboard Fallback
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
        alert("Invitation message copied to clipboard! You can now paste it in WhatsApp or any other app.");
      } else {
        // 3. Last Resort: WhatsApp Direct Link (especially useful on mobile if clipboard fails)
        const whatsappUrl = `https://wa.me/${selectedPerson.phone ? selectedPerson.phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err: any) {
      console.error("Error sharing", err);
      // If native share was canceled by user, don't show error
      if (err.name === 'AbortError') return;

      // Final fallback to WhatsApp if anything else fails
      const whatsappUrl = `https://wa.me/${selectedPerson.phone ? selectedPerson.phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const filteredPersons = persons.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone && p.phone.includes(search))
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const fetchTransactions = async (personId: string) => {
    try {
      setTxLoading(true);
      const res = await api.get(`/transactions/person/${personId}`);
      setTransactions(res.data);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setTxLoading(false);
    }
  };

  const handleStatusChange = async (txId: string, newStatus: "pending" | "completed") => {
    try {
      await api.put(`/transactions/${txId}`, { status: newStatus });
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: newStatus } : tx));
      // Also update persons to reflect balance change if necessary
      fetchPersons();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${txId}`);
      setTransactions(prev => prev.filter(tx => tx.id !== txId));
      setSelectedTx(null);
      fetchPersons();
    } catch (err) {
      console.error("Failed to delete transaction", err);
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
    navigate("/add-transaction", {
      state: {
        editingTx: tx,
        personId: selectedPerson?.id,
        personName: selectedPerson?.name
      }
    });
  };

  const handlePersonClick = (person: Person, tab: "profile" | "transactions" = "transactions") => {
    navigate(`/person/${person.id}?tab=${tab}`);
  };

  // ---------------------------------------------------------
  // DETAIL VIEW SCREEN
  // ---------------------------------------------------------
  if (selectedPerson) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-white dark:bg-[#0a0a1a]">
        <div className="max-w-4xl mx-auto w-full font-sans animate-in slide-in-from-bottom-6 duration-300 min-h-screen flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-30 flex items-center gap-4 px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-gray-100/50 dark:border-gray-800/50">
            <button
              onClick={() => {
                if (detailTab === "edit") {
                  setDetailTab("profile");
                  navigate(`/person/${selectedPerson.id}?tab=profile`, { replace: true });
                } else {
                  navigate("/person");
                }
              }}
              className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
            >
              {detailTab === "edit" ? <X size={22} className="text-gray-600 dark:text-gray-300" /> : <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />}
            </button>
            <div className="flex flex-col">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-wide">
                {detailTab === "transactions" ? "Transaction List" : detailTab === "edit" ? "Update Person" : "Person Details"}
              </h2>
              {detailTab === "transactions" ? (
                <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  for {selectedPerson.name}
                </p>
              ) : (
                detailTab === "profile" && selectedPerson.linked_user_id && (
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm self-start animate-in zoom-in duration-300">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">On App</span>
                  </div>
                )
              )}
            </div>

            {detailTab !== "edit" && (
              detailTab === "transactions" ? (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setShowTxSearch(!showTxSearch)}
                    className={`p-2.5 rounded-2xl transition-all border ${showTxSearch ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20' : 'bg-gray-50 dark:bg-[#151624] text-gray-400 border-gray-100 dark:border-gray-800'}`}
                  >
                    <Search size={20} />
                  </button>
                  <button
                    onClick={() => navigate("/add-transaction", { state: { personId: selectedPerson.id, personName: selectedPerson.name, status: statusFilter } })}
                    className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white hover:from-indigo-600 hover:to-indigo-800 transition-colors shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>
              ) : (
                <div className="ml-auto">
                  <button
                    onClick={() => {
                      const names = selectedPerson.name.split(" ");
                      const firstName = names[0] || "";
                      const lastName = names.slice(1).join(" ");
                      setEditForm({
                        first_name: firstName,
                        last_name: lastName,
                        phone: selectedPerson.phone || "",
                        notes: selectedPerson.notes || ""
                      });
                      setDetailTab("edit");
                      navigate(`/person/${selectedPerson.id}?tab=edit`, { replace: true });
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100 dark:border-indigo-500/20 shadow-sm"
                  >
                    <SquarePen size={18} />
                    <span className="text-xs font-black tracking-wide">Edit</span>
                  </button>
                </div>
              )
            )}
          </div>

          <div className="px-5 mt-4 space-y-6">

            {/* Transaction Search Bar */}
            {detailTab === "transactions" && (
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showTxSearch ? 'max-h-20 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="w-full bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all placeholder:transition-opacity focus:placeholder:opacity-0"
                  />
                  {txSearch && (
                    <button
                      onClick={() => {
                        setTxSearch("");
                        setShowTxSearch(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Profile Section */}
            {detailTab === "profile" && (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="relative flex items-start gap-4 p-5 rounded-[1.5rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-indigo-500/20 shadow-lg shadow-indigo-900/5 dark:shadow-none">
                  <div className="w-14 h-14 rounded-full border-2 border-indigo-500 shrink-0 bg-indigo-50 dark:bg-[#1e1a3b] flex items-center justify-center">
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{selectedPerson.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <MarqueeText
                      text={selectedPerson.name}
                      className="text-lg font-black text-gray-900 dark:text-white tracking-tight"
                    />
                    {selectedPerson.phone && (
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{selectedPerson.phone}</p>
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      {selectedPerson.linked_user_id ? (
                        <>
                          {(!selectedPerson.connection_status || selectedPerson.connection_status === "none") && (
                            <button onClick={handleSendRequest} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all active:scale-95">
                              <UserPlus size={14} /> Send Request
                            </button>
                          )}
                          {selectedPerson.connection_status === "requested" && (
                            <button disabled className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-500/20 transition-all cursor-default">
                              <Clock size={14} /> Requested
                            </button>
                          )}
                          {selectedPerson.connection_status === "connected" && (
                            <button disabled className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20 transition-all cursor-default">
                              <CheckCircle2 size={14} /> Connected
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={handleInviteApp}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                          <UserPlus size={14} /> Invite to App
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Contact Info */}
                <div>
                  <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider mb-3 px-2">Contact Information</h3>
                  <div className="rounded-[1.5rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden">
                    <InfoRow icon={Phone} label="Mobile Number" value={selectedPerson.phone} />
                    <InfoRow icon={Calendar} label="Added On" value={formatDate(selectedPerson.createdAt)} last={!selectedPerson.notes} />
                    {selectedPerson.notes && <InfoRow icon={MessageSquare} label="Notes" value={selectedPerson.notes} last />}
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Section */}
            {detailTab === "transactions" && (
              <div>
                {/* Status Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-800 mb-8 relative">
                  <button
                    onClick={() => setStatusFilter("pending")}
                    className={`flex-1 py-4 font-bold text-sm transition-all duration-300 relative ${statusFilter === "pending"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 hover:text-gray-600 dark:text-gray-500"
                      }`}
                  >
                    Pending
                    {statusFilter === "pending" && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full animate-in fade-in slide-in-from-bottom-1" />
                    )}
                  </button>
                  <div className="w-px h-8 bg-gray-100 dark:bg-gray-800 self-center" />
                  <button
                    onClick={() => setStatusFilter("completed")}
                    className={`flex-1 py-4 font-bold text-sm transition-all duration-300 relative ${statusFilter === "completed"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 hover:text-gray-600 dark:text-gray-500"
                      }`}
                  >
                    Completed
                    {statusFilter === "completed" && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full animate-in fade-in slide-in-from-bottom-1" />
                    )}
                  </button>
                </div>

                {/* Transaction List */}
                {txLoading ? (
                  <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-10 rounded-[1.5rem] bg-white/50 dark:bg-[#151624]/50 border border-dashed border-gray-200 dark:border-gray-800">
                    <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IndianRupee size={24} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">No transactions yet</p>
                    <p className="text-xs text-gray-500 mt-1 mb-6">Start by adding the first record.</p>
                    <button
                      onClick={() => navigate("/add-transaction", { state: { personId: selectedPerson.id, personName: selectedPerson.name } })}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-bold text-sm transition-all shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 active:scale-95"
                    >
                      <PlusCircle size={18} />
                      Add Transaction
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions
                      .filter(tx => tx.status === statusFilter)
                      .filter(tx =>
                        !txSearch ||
                        (tx.reason && tx.reason.toLowerCase().includes(txSearch.toLowerCase())) ||
                        tx.amount.toString().includes(txSearch)
                      )
                      .map(tx => (
                        <div
                          key={tx.id}
                          onClick={() => {
                            console.log("Opening Person Drawer for:", tx.id);
                            setSelectedTx(tx);
                          }}
                          className="flex items-center justify-between p-4 rounded-[1.2rem] bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800/80 shadow-sm group cursor-pointer hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                            <div className={`p-2.5 rounded-xl ${tx.type === "credit" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                              {tx.type === "credit" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <MarqueeText
                                text={tx.reason || (tx.type === "credit" ? "Credit" : "Debit")}
                                className="text-sm font-bold text-gray-900 dark:text-white"
                              />
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                <Clock size={10} />
                                <span>{formatDate(tx.date || tx.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <MarqueeText
                              text={`${tx.type === "credit" ? "+" : "-"}${currencySymbol}${tx.amount}`}
                              className={`text-sm font-black ${tx.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                              containerClassName="justify-end min-w-[60px]"
                            />
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTxMenuId(tx.id);
                              }}
                              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              <MoreVertical size={16} />
                            </div>
                          </div>
                        </div>
                      ))}
                    {transactions.filter(tx => tx.status === statusFilter).length === 0 && (
                      <div className="text-center py-10 opacity-50">
                        <p className="text-sm font-bold text-gray-500">No {statusFilter} transactions found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Edit Section */}
            {detailTab === "edit" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center mb-10">
                  <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-4 shadow-xl shadow-indigo-500/5">
                    <User size={48} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Update Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Refine contact details</p>
                </div>

                <form onSubmit={handleUpdateSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FloatingInput
                      icon={User}
                      label="First Name"
                      name="first_name"
                      value={editForm.first_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, first_name: e.target.value })}
                      placeholder="Enter first name"
                      required
                    />
                    <FloatingInput
                      icon={User}
                      label="Last Name"
                      name="last_name"
                      value={editForm.last_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, last_name: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>

                  <FloatingInput
                    icon={Phone}
                    label="Phone Number"
                    name="phone"
                    value={editForm.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="Enter mobile number"
                  />

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 flex items-center gap-2">
                      <StickyNote size={12} /> Notes (Optional)
                    </label>
                    <textarea
                      rows={4}
                      value={editForm.notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white transition-all resize-none shadow-sm placeholder:transition-opacity focus:placeholder:opacity-0"
                      placeholder="Add some details about this person..."
                    />
                  </div>
                </form>
              </div>
            )}
          </div>

          {detailTab === "edit" && (
            <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-40 mt-auto">
              <div className="flex flex-col gap-3">
                <button
                  onClick={(e: any) => {
                    e.preventDefault();
                    handleUpdateSubmit(e);
                  }}
                  disabled={submitLoading}
                  className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {submitLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  <span className="uppercase tracking-widest text-sm font-bold">
                    {submitLoading ? "Updating..." : "Update Details"}
                  </span>
                </button>
                {/* <button
                  onClick={() => setDetailTab("profile")}
                  className="w-full h-12 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-bold text-sm rounded-2xl hover:bg-gray-100 transition-all border border-gray-100 dark:border-gray-800"
                >
                  Cancel
                </button> */}
              </div>
            </div>
          )}

          {detailTab === "transactions" && transactions.length > 0 && (
            <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-40 mt-auto">
              <button
                onClick={() => navigate("/add-transaction", { state: { personId: selectedPerson.id, personName: selectedPerson.name, status: statusFilter } })}
                className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <PlusCircle size={18} />
                <span className="uppercase tracking-widest text-sm font-bold">Add New Transaction</span>
              </button>
            </div>
          )}

          {selectedTx && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col justify-end transition-all duration-300"
              onClick={() => setSelectedTx(null)}
            >
              <div
                className="bg-white dark:bg-[#0a0a1a] rounded-t-[2.5rem] p-6 sm:p-8 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300 sm:max-w-md sm:mx-auto sm:w-full sm:rounded-[2.5rem] sm:mb-8 border-t border-indigo-100/50 dark:border-gray-800 translate-y-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8"></div>

                <div className="flex flex-col items-center mb-8">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 ${selectedTx.type === "credit" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10"}`}>
                    {selectedTx.type === "credit" ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Transaction Details</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {selectedTx.id.slice(0, 8)}</p>
                </div>

                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</span>
                    <span className={`text-sm font-black uppercase ${selectedTx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{selectedTx.type}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</span>
                    <span className={`text-lg font-black ${selectedTx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{currencySymbol}{selectedTx.amount}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(selectedTx.date || selectedTx.createdAt)}</span>
                  </div>
                  {selectedTx.reason && (
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</span>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedTx.reason}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
                  >
                    Close
                  </button>
                  {selectedTx.status === "pending" && (
                    <button
                      onClick={() => {
                        handleStatusChange(selectedTx.id, "completed");
                        setSelectedTx(null);
                      }}
                      className="flex-[2] py-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black text-sm shadow-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <CheckCircle2 size={18} strokeWidth={3} />
                      Mark as Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Action Bottom Drawer */}
          {activeTxMenuId && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] animate-in fade-in duration-300 flex flex-col justify-end"
              onClick={() => setActiveTxMenuId(null)}
            >
              <div
                className="bg-white dark:bg-[#151624] rounded-t-[2.5rem] p-5 sm:p-6 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300 sm:max-w-md sm:mx-auto sm:w-full sm:rounded-[2.5rem] sm:mb-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const tx = transactions.find(t => t.id === activeTxMenuId);
                      if (tx) setSelectedTx(tx);
                      setActiveTxMenuId(null);
                    }}
                    className="w-full px-5 py-3.5 text-left text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-4 rounded-2xl"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <Eye size={20} />
                    </div>
                    Transaction Details
                  </button>

                  <button
                    onClick={() => {
                      const tx = transactions.find(t => t.id === activeTxMenuId);
                      if (tx) handleEditTransaction(tx);
                      setActiveTxMenuId(null);
                    }}
                    className="w-full px-5 py-3.5 text-left text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-4 rounded-2xl"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <SquarePen size={20} />
                    </div>
                    Edit Transaction
                  </button>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        handleDeleteTransaction(activeTxMenuId!);
                        setActiveTxMenuId(null);
                      }}
                      className="w-full px-5 py-3.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all flex items-center gap-4 rounded-2xl"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600">
                        <Trash2 size={20} />
                      </div>
                      Delete Transaction
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTxMenuId(null)}
                  className="w-full mt-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // ADD MODE SCREEN
  // ---------------------------------------------------------
  if (isAdding) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-white dark:bg-[#0a0a1a]">
        <div className="max-w-4xl mx-auto w-full bg-white/60 backdrop-blur-3xl dark:bg-[#0a0a1a]/50 animate-in slide-in-from-bottom-10 duration-500 font-sans transition-colors duration-300 shadow-2xl shadow-indigo-900/5 sm:border-x border-indigo-50 dark:border-gray-800 min-h-screen flex flex-col">
          {/* Add Header */}
          <div className="sticky top-0 z-30 flex items-center gap-4 px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
            <button
              onClick={() => navigate("/person")}
              className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
            >
              <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              Add Person
            </h2>
            {isContactPickerSupported && (
              <button
                type="button"
                onClick={handleImportContact}
                className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100/50 dark:border-indigo-500/20 shadow-sm active:scale-95 animate-in fade-in duration-300"
              >
                <Users size={16} />
                <span className="text-[10px] font-black tracking-wider uppercase">Select Contact</span>
              </button>
            )}
          </div>

          {/* Add Form Container */}
          <div className="px-6 py-8 w-full">
            <div className="flex items-center justify-center mb-10">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <UserPlus size={32} />
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSubmit();
              }}
              className="space-y-6 pb-28"
            >
              <FloatingInput icon={User} label="First Name *" name="first_name" placeholder="e.g. John" value={formData.first_name} onChange={handleChange} />
              <FloatingInput icon={User} label="Last Name" name="last_name" placeholder="e.g. Doe" value={formData.last_name} onChange={handleChange} />
              <FloatingInput icon={Phone} label="Mobile Number *" name="phone_number" type="tel" placeholder="+91 00000 00000" value={formData.phone_number} onChange={handleChange} />
              <FloatingInput icon={StickyNote} label="Notes (Optional)" name="notes" placeholder="Any extra info..." value={formData.notes} onChange={handleChange} />
            </form>
          </div>

          {/* Fixed Bottom Button Wrapper */}
          <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/90 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-50 mt-auto">
            <div className="max-w-4xl mx-auto w-full">
              <button
                onClick={handleAddSubmit}
                disabled={submitLoading || !formData.first_name}
                className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]"
              >
                {submitLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span className="uppercase tracking-[0.1em] text-sm font-bold">
                      Add Person
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // LIST VIEW SCREEN
  // ---------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto w-full font-sans transition-colors duration-300 pb-8">

      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
          >
            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
            Person List
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2.5 rounded-2xl bg-indigo-50/50 dark:bg-[#151624] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-[#1e1f30] transition-colors border border-indigo-100/50 dark:border-indigo-500/20"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => navigate("/person/add")}
            className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white transition-colors shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-6">

        {/* Animated Search Bar */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSearch ? 'max-h-20 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Person List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredPersons.length === 0 ? (
          <div className="text-center py-20 bg-white/50 dark:bg-[#151624]/50 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No contacts found</h3>
            <p className="text-gray-500 text-sm mt-1 mb-6">Start by adding your first contact.</p>
            <button
              onClick={() => navigate("/person/add")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-bold text-sm transition-all shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 active:scale-95"
            >
              <UserPlus size={18} />
              Add New Person
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-32">
            {filteredPersons.map((person) => {
              const credit = person.totalCredit || 0;
              const debit = person.totalDebit || 0;

              return (
                <div
                  key={person.id}
                  className="relative bg-white dark:bg-[#151624] rounded-[1.5rem] border border-gray-100 dark:border-gray-800/80 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all group flex flex-col overflow-hidden"
                >
                  <div
                    onClick={() => handlePersonClick(person, "profile")}
                    className="flex items-start justify-between p-5 pb-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100 dark:active:bg-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-[1rem] bg-indigo-50 dark:bg-[#1b1c2e] text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition-transform">
                        {person.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <MarqueeText
                            text={person.name}
                            containerClassName="max-w-[120px] sm:max-w-[180px]"
                            className="text-base font-bold text-gray-900 dark:text-white"
                          />
                        </div>
                        {person.phone && (
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide">
                            {person.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Side Status & Menu */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(person.id);
                        }}
                        className="p-1.5 -mr-1.5 -mt-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {person.linked_user_id ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm animate-in zoom-in duration-300">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">On App</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm animate-in zoom-in duration-300">
                          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                          <span className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Not on App</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div
                    onClick={() => handlePersonClick(person, "transactions")}
                    className="px-5 pb-5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100 dark:active:bg-gray-800"
                  >
                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-50 dark:border-gray-800/50">
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp size={10} className="text-emerald-500" /> Credit
                          </span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {currencySymbol}{credit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 border-l border-gray-100 dark:border-gray-800/80 pl-3">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            <TrendingDown size={10} className="text-rose-500" /> Debit
                          </span>
                          <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                            {currencySymbol}{debit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <div className="p-1 rounded-lg text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Bottom Drawer */}
        {activeMenuId && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300 flex flex-col justify-end"
            onClick={() => { setActiveMenuId(null); setDeleteError(null); setIsConfirmingDelete(false); }}
          >
            <div
              className="bg-white dark:bg-[#151624] rounded-t-[2.5rem] p-5 sm:p-6 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300 sm:max-w-md sm:mx-auto sm:w-full sm:rounded-[2.5rem] sm:mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>

              {isConfirmingDelete ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white text-center mb-2">Delete Person?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8 px-4 leading-relaxed">
                    Are you sure you want to delete this person? This action cannot be undone.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      No, Cancel
                    </button>
                    <button
                      onClick={() => confirmDelete(activeMenuId!)}
                      className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const p = persons.find(x => x.id === activeMenuId);
                      if (p) handlePersonClick(p, "profile");
                      setActiveMenuId(null);
                    }}
                    className="w-full px-5 py-3.5 text-left text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-4 rounded-2xl"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <User size={20} />
                    </div>
                    View Details
                  </button>

                  <button
                    onClick={() => {
                      const p = persons.find(x => x.id === activeMenuId);
                      if (p) handlePersonClick(p, "transactions");
                      setActiveMenuId(null);
                    }}
                    className="w-full px-5 py-3.5 text-left text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-4 rounded-2xl"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <Clock size={20} />
                    </div>
                    View Transactions
                  </button>

                  <div className="pt-2">
                    <button
                      onClick={() => handleDelete(activeMenuId!)}
                      className="w-full px-5 py-3.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all flex items-center gap-4 rounded-2xl"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600">
                        <Trash2 size={20} />
                      </div>
                      Delete Person
                    </button>
                    {deleteError && (
                      <div className="mt-2 w-fit mx-auto px-4 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold animate-in fade-in slide-in-from-top-1">
                        {deleteError}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isConfirmingDelete && (
                <button
                  onClick={() => { setActiveMenuId(null); setDeleteError(null); setIsConfirmingDelete(false); }}
                  className="w-full mt-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Drawer */}
      {selectedTx && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col justify-end transition-all duration-300"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="bg-white dark:bg-[#0a0a1a] rounded-t-[2.5rem] p-6 sm:p-8 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300 sm:max-w-md sm:mx-auto sm:w-full sm:rounded-[2.5rem] sm:mb-8 border-t border-indigo-100/50 dark:border-gray-800 translate-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8"></div>

            <div className="flex flex-col items-center mb-8">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 ${selectedTx.type === "credit" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10"}`}>
                {selectedTx.type === "credit" ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Transaction Details</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {selectedTx.id.slice(0, 8)}</p>
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</span>
                <span className={`text-sm font-black uppercase ${selectedTx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{selectedTx.type}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</span>
                <span className={`text-lg font-black ${selectedTx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{currencySymbol}{selectedTx.amount}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(selectedTx.date || selectedTx.createdAt)}</span>
              </div>
              {selectedTx.reason && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</span>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedTx.reason}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTx(null)}
                className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
              >
                Close
              </button>
              {selectedTx.status === "pending" && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedTx.id, "completed");
                    setSelectedTx(null);
                  }}
                  className="flex-[2] py-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black text-sm shadow-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <CheckCircle2 size={18} strokeWidth={3} />
                  Mark as Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Action Bottom Drawer */}
      {activeTxMenuId && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] animate-in fade-in duration-300 flex flex-col justify-end"
          onClick={() => setActiveTxMenuId(null)}
        >
          <div
            className="bg-white dark:bg-[#151624] rounded-t-[2.5rem] p-5 sm:p-6 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300 sm:max-w-md sm:mx-auto sm:w-full sm:rounded-[2.5rem] sm:mb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  const tx = transactions.find(t => t.id === activeTxMenuId);
                  if (tx) setSelectedTx(tx);
                  setActiveTxMenuId(null);
                }}
                className="w-full px-5 py-3.5 text-left text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-4 rounded-2xl"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <Eye size={20} />
                </div>
                Transaction Details
              </button>

              <button
                onClick={() => {
                  const tx = transactions.find(t => t.id === activeTxMenuId);
                  if (tx) handleEditTransaction(tx);
                  setActiveTxMenuId(null);
                }}
                className="w-full px-5 py-3.5 text-left text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-4 rounded-2xl"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <SquarePen size={20} />
                </div>
                Edit Transaction
              </button>

              <div className="pt-2">
                <button
                  onClick={() => {
                    handleDeleteTransaction(activeTxMenuId!);
                    setActiveTxMenuId(null);
                  }}
                  className="w-full px-5 py-3.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all flex items-center gap-4 rounded-2xl"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600">
                    <Trash2 size={20} />
                  </div>
                  Delete Transaction
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveTxMenuId(null)}
              className="w-full mt-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {persons.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-40">
          <div className="max-w-4xl mx-auto w-full">
            <button
              onClick={() => navigate("/person/add")}
              className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <UserPlus size={18} />
              <span className="uppercase tracking-widest text-sm font-bold">Add New Person</span>
            </button>
          </div>
        </div>
      )}
      {justAddedPerson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#151624] rounded-[2rem] p-6 max-w-sm w-full border border-indigo-50/50 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Decorative success animation */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>
            </div>
            
            <h3 className="text-lg font-black text-gray-900 dark:text-white text-center tracking-tight mb-2">
              Person Added! 🎉
            </h3>
            
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-6 px-2">
              Would you like to invite <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{justAddedPerson.name}</span> to track shared transactions and balances on Money Track?
            </p>
            
            <div className="space-y-2.5">
              <button
                onClick={() => handleInvite("whatsapp")}
                className="w-full h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <MessageSquare size={16} />
                Invite via WhatsApp
              </button>
              
              <button
                onClick={() => handleInvite("sms")}
                className="w-full h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <Phone size={16} />
                Invite via SMS
              </button>
              
              <button
                onClick={handleCloseInviteModal}
                className="w-full h-12 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center text-xs uppercase tracking-wider"
              >
                Skip & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Person;
