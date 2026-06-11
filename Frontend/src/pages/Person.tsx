import React, { useState, useEffect } from "react";
import {
  Search, User, Phone, ArrowLeft, UserPlus, Users,
  StickyNote, Loader2, Calendar, MessageSquare,
  TrendingUp, TrendingDown, IndianRupee, MoreVertical, Clock, PlusCircle, Trash2, SquarePen, X, CheckCircle2, ChevronRight, Eye, AlertCircle, AlertTriangle, Mail, MapPin, Share2
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import MarqueeText from "../components/MarqueeText";
import toast from "react-hot-toast";

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
  upi_id?: string;
  email?: string;
  address?: string;
  profile_picture?: string;
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

interface BulkContact {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  notes: string;
  error?: string;
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
  error,
}: any) => {
  return (
    <div className="w-full">
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
          autoComplete={autoComplete}
          maxLength={name === "phone_number" || name === "phone" ? 10 : undefined}
          inputMode={name === "phone_number" || name === "phone" ? "numeric" : undefined}
          pattern={name === "phone_number" || name === "phone" ? "[0-9]*" : undefined}
          className={`peer w-full pl-11 pr-4 py-4 bg-slate-50/50 dark:bg-slate-800/50 border rounded-2xl outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-4 transition-all text-sm font-medium text-slate-900 dark:text-white ${error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/5"
            : "border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/5"
            }`}
        />
        <label
          className={`absolute left-11 top-1/2 -translate-y-1/2 text-sm font-medium transition-all duration-200 pointer-events-none
          peer-focus:-top-1 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-black peer-focus:uppercase peer-focus:tracking-widest peer-focus:bg-white dark:peer-focus:bg-[#0a0a1a] peer-focus:px-2
          peer-[:not(:placeholder-shown)]:-top-1 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-[#0a0a1a] peer-[:not(:placeholder-shown)]:px-2
          ${error
              ? "text-rose-500 dark:text-rose-400 peer-focus:text-rose-500 dark:peer-focus:text-rose-400"
              : "text-slate-400 dark:text-slate-500 peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
            }
        `}
        >
          {label}
        </label>
      </div>
      {error && (
        <p className="text-[10px] font-bold text-rose-500 mt-1.5 px-2 animate-in fade-in slide-in-from-top-1 duration-200 flex items-center gap-1.5">
          <AlertCircle size={10} className="shrink-0" />
          {error}
        </p>
      )}
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
  onClick,
}: {
  icon: any;
  label: string;
  value?: string;
  iconColor?: string;
  last?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-5 ${!last ? "border-b border-gray-50 dark:border-gray-800/50" : ""} ${onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1b2a] transition-colors" : ""}`}
  >
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
      const opts = { multiple: true };
      const contacts = await (navigator as any).contacts.select(props, opts);

      if (contacts && contacts.length > 0) {
        if (contacts.length === 1 && bulkContacts.length === 0) {
          const contact = contacts[0];
          const fullName = contact.name && contact.name[0] ? contact.name[0] : "";
          const rawPhone = contact.tel && contact.tel[0] ? contact.tel[0] : "";
          const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
          const nameParts = fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          setFormData(prev => ({
            ...prev,
            first_name: firstName,
            last_name: lastName,
            phone_number: cleanPhone
          }));
        } else {
          const newBulkContacts = contacts.map((contact: any, index: number) => {
            const fullName = contact.name && contact.name[0] ? contact.name[0] : "";
            const rawPhone = contact.tel && contact.tel[0] ? contact.tel[0] : "";
            const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
            const nameParts = fullName.trim().split(/\s+/);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            
            return {
              id: Date.now().toString() + index,
              first_name: firstName,
              last_name: lastName,
              phone_number: cleanPhone,
              notes: ""
            };
          });
          setBulkContacts(prev => [...prev, ...newBulkContacts]);
        }
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
  const [bulkContacts, setBulkContacts] = useState<BulkContact[]>([]);
  const [bulkSubmitLoading, setBulkSubmitLoading] = useState(false);

  const handleBulkSubmit = async () => {
    let hasError = false;
    const validatedContacts = bulkContacts.map(c => {
      let error = "";
      if (!c.first_name.trim()) error = "First name is required";
      else if (!c.phone_number) error = "Mobile number is required";
      else if (c.phone_number.replace(/\D/g, "").length !== 10) error = "Invalid 10-digit number";
      else if (persons.some(p => p.phone?.replace(/\D/g, "") === c.phone_number.replace(/\D/g, ""))) {
        error = "Number already exists in list";
      }
      if (error) hasError = true;
      return { ...c, error };
    });

    if (hasError) {
      setBulkContacts(validatedContacts);
      toast.error("Please fix the errors before saving.");
      return;
    }

    try {
      setBulkSubmitLoading(true);
      await Promise.all(
        bulkContacts.map(c =>
          api.post("/person", {
            name: `${c.first_name} ${c.last_name}`.trim(),
            phone: c.phone_number,
            notes: c.notes,
          })
        )
      );
      toast.success(`${bulkContacts.length} contacts added successfully!`);
      navigate("/person");
      setBulkContacts([]);
      setFormData({ first_name: "", last_name: "", phone_number: "", notes: "" });
      fetchPersons();
    } catch (error: any) {
      console.error("Bulk add failed", error);
      toast.error("Some contacts failed to save.");
    } finally {
      setBulkSubmitLoading(false);
    }
  };

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
  const [settleTx, setSettleTx] = useState<Transaction | null>(null);
  const [isSettlePersonModalOpen, setIsSettlePersonModalOpen] = useState(false);
  const [isUpiPaymentModalOpen, setIsUpiPaymentModalOpen] = useState(false);
  const [upiPaymentStep, setUpiPaymentStep] = useState<"enter_amount" | "confirm_payment" | "success">("enter_amount");
  const [upiPaymentAmount, setUpiPaymentAmount] = useState("");
  const [upiPaymentMaxAmount, setUpiPaymentMaxAmount] = useState<number>(0);
  const [selectedUpiPerson, setSelectedUpiPerson] = useState<Person | null>(null);
  const [upiPaymentError, setUpiPaymentError] = useState<string | null>(null);
  const [settlePersonError, setSettlePersonError] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [settleLoading, setSettleLoading] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", notes: "" });
  const [txSearch, setTxSearch] = useState("");
  const [showTxSearch, setShowTxSearch] = useState(false);
  const [activeTxMenuId, setActiveTxMenuId] = useState<string | null>(null);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const [justAddedPerson, setJustAddedPerson] = useState<{ name: string; phone: string } | null>(null);
  const [formErrors, setFormErrors] = useState<{ first_name?: string; phone_number?: string }>({});
  const [editErrors, setEditErrors] = useState<{ first_name?: string; phone?: string }>({});

  useEffect(() => {
    setFormErrors({});
    setEditErrors({});
  }, [location.pathname, detailTab]);

  const handleInvite = async (method: "whatsapp" | "sms" | "share") => {
    if (!justAddedPerson) return;

    const { name, phone } = justAddedPerson;
    // Remove the protocol prefix (https:// or http://) to prevent the messaging client from showing a link preview containing the product logo
    const appUrl = window.location.origin.replace(/^https?:\/\//, "");
    const userName = user?.name || "Money Track";
    const msg = `Hello ${name},\n\nI have added you on the Money Track app to easily and transparently manage our shared transactions and balances. You can view our live ledger and track transaction history here:\n${appUrl}\n\nRegards,\n${userName}`;

    if (method === "share") {
      const shareData = {
        title: "Money Track Invite",
        text: msg,
      };
      try {
        if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
          await navigator.share(shareData);
          handleCloseInviteModal();
        } else {
          await navigator.clipboard.writeText(msg);
          toast.success("Message copied to clipboard!");
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
          await navigator.clipboard.writeText(msg);
          toast.success("Message copied to clipboard!");
        }
      }
      return;
    }

    if (method === "whatsapp") {
      const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
      window.location.href = whatsappUrl;

      // WhatsApp is https link, so 1 second is perfect
      setTimeout(() => {
        handleCloseInviteModal();
      }, 1000);
    } else {
      const smsUrl = navigator.userAgent.match(/iPhone|iPad|iPod/i)
        ? `sms:${phone}&body=${encodeURIComponent(msg)}`
        : `sms:${phone}?body=${encodeURIComponent(msg)}`;

      // Dual-layer listener: trigger immediately on window blur (when SMS app opens)
      const handleSmsRedirect = () => {
        handleCloseInviteModal();
        window.removeEventListener("blur", handleSmsRedirect);
      };
      window.addEventListener("blur", handleSmsRedirect);

      window.location.href = smsUrl;

      // Fallback redirect after 2 seconds to allow the SMS deep link to fire uninterrupted
      setTimeout(() => {
        handleSmsRedirect();
      }, 2000);
    }
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
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
    if (name === "phone_number") {
      const cleanedValue = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: cleanedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormErrors({});

    const errors: { first_name?: string; phone_number?: string } = {};
    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required.";
    }
    if (!formData.phone_number) {
      errors.phone_number = "Mobile number is required.";
    } else if (formData.phone_number.replace(/\D/g, "").length !== 10) {
      errors.phone_number = "Please enter a valid 10-digit mobile number.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (formData.phone_number) {
      const isDuplicate = persons.some(
        (p) => p.phone?.replace(/\D/g, "") === formData.phone_number.replace(/\D/g, "")
      );
      if (isDuplicate) {
        setFormErrors({ phone_number: "This mobile number is already associated with an existing contact in your list." });
        return;
      }
    }

    try {
      setSubmitLoading(true);
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      await api.post("/person", {
        name: fullName,
        phone: formData.phone_number,
        notes: formData.notes,
      });

      // If phone number exists, show invite success dialog modal right here on the Add screen
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
    if (!selectedPerson) return;
    setEditErrors({});

    const errors: { first_name?: string; phone?: string } = {};
    if (!editForm.first_name.trim()) {
      errors.first_name = "First name is required.";
    }
    if (!editForm.phone) {
      errors.phone = "Mobile number is required.";
    } else if (editForm.phone.replace(/\D/g, "").length !== 10) {
      errors.phone = "Please enter a valid 10-digit mobile number.";
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    if (editForm.phone && selectedPerson) {
      const isDuplicate = persons.some(
        (p) => p.id !== selectedPerson.id && p.phone?.replace(/\D/g, "") === editForm.phone.replace(/\D/g, "")
      );
      if (isDuplicate) {
        setEditErrors({ phone: "This mobile number is already associated with another contact in your list." });
        return;
      }
    }

    try {
      setSubmitLoading(true);
      const fullName = `${editForm.first_name} ${editForm.last_name}`.trim();
      const updateData = {
        name: fullName,
        phone: editForm.phone,
        notes: editForm.notes
      };
      const res = await api.put(`/person/${selectedPerson.id}`, updateData);
      setSelectedPerson(res.data);
      fetchPersons();
      setDetailTab("profile");
      navigate(`/person/${selectedPerson.id}?tab=profile`, { replace: true });
      toast.success("Details updated successfully!");
    } catch (error: any) {
      console.error("Failed to update person", error);
      toast.error(error.response?.data?.error || "Failed to update person");
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
      toast.success("Person deleted successfully!");
    } catch (error: any) {
      console.error("Failed to delete person", error);
      toast.error(error.response?.data?.error || "Failed to delete person");
    }
  };

  const handleSendRequest = async (eOrPerson?: Person | React.MouseEvent) => {
    const targetPerson = (eOrPerson && 'id' in eOrPerson) ? eOrPerson : selectedPerson;
    if (!targetPerson || isSendingRequest) return;
    setIsSendingRequest(true);
    try {
      await api.post(`/person/${targetPerson.id}/request`);
      if (selectedPerson && selectedPerson.id === targetPerson.id) {
        setSelectedPerson(prev => prev ? { ...prev, connection_status: "requested" } : null);
      }
      setPersons(prev => prev.map(p => p.id === targetPerson.id ? { ...p, connection_status: "requested" } : p));
      toast.success("Connection request sent!");
    } catch (error: any) {
      console.error("Failed to send request", error);
      toast.error(error.response?.data?.error || "Failed to send connection request");
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleInviteApp = async (eOrPerson?: Person | React.MouseEvent) => {
    const targetPerson = (eOrPerson && 'id' in eOrPerson) ? eOrPerson : selectedPerson;
    if (!targetPerson) {
      alert("Person details not found.");
      return;
    }

    // Fallback name if user is not loaded
    const senderName = user?.name || "Your Friend";

    // URL without protocol prefix (https://) to prevent the messaging client from showing a link preview containing the product logo
    const appUrl = "moneytrackflow.vercel.app";

    const message = `Hi ${targetPerson.name}! 👋

I've been using *Money Track* to manage shared expenses with friends and contacts — and it's been really helpful!

We already have some transactions recorded together. Join Money Track to easily see what we owe each other, all in one place.

🔗 Get started for free:
${appUrl}

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
        const whatsappUrl = `https://wa.me/${targetPerson.phone ? targetPerson.phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err: any) {
      console.error("Error sharing", err);
      // If native share was canceled by user, don't show error
      if (err.name === 'AbortError') return;

      // Final fallback to WhatsApp if anything else fails
      const whatsappUrl = `https://wa.me/${targetPerson.phone ? targetPerson.phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(message)}`;
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

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
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

  const openSettleModal = (tx: Transaction) => {
    setSettleTx(tx);
    setSettleAmount(Math.round(Number(tx.amount)).toString());
    setSettleNote("");
    setSelectedTx(null); // Close detail drawer
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTx) return;

    const amt = Number(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (amt > Number(settleTx.amount)) {
      alert(`Settle amount cannot exceed the pending amount of ${currencySymbol}${settleTx.amount}`);
      return;
    }

    try {
      setSettleLoading(true);
      await api.post(`/transactions/${settleTx.id}/settle`, {
        settleAmount: amt,
        note: settleNote
      });

      setSettleTx(null);
      if (selectedPerson) {
        fetchTransactions(selectedPerson.id);
      }
      fetchPersons();
    } catch (err: any) {
      console.error("Failed to settle transaction", err);
      alert(err.response?.data?.error || "Failed to settle transaction.");
    } finally {
      setSettleLoading(false);
    }
  };

  const handleSettlePersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettlePersonError(null);
    if (!selectedPerson || !settleAmount || isNaN(Number(settleAmount)) || Number(settleAmount) <= 0) {
      setSettlePersonError("Please enter a valid amount.");
      return;
    }

    const txs = transactions.filter(t => t.status === "pending");
    const credit = txs.filter(t => t.type === 'credit').reduce((sum, t) => sum + Number(t.amount), 0);
    const debit = txs.filter(t => t.type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0);
    const netBalance = Math.abs(credit - debit);

    if (Number(settleAmount) > netBalance) {
      setSettlePersonError(`Cannot settle more than ${currencySymbol}${netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`);
      return;
    }

    try {
      setSettleLoading(true);
      await api.post(`/transactions/person/${selectedPerson.id}/settle`, {
        settleAmount: Number(settleAmount),
        note: settleNote
      });

      setIsSettlePersonModalOpen(false);
      setSettleAmount("");
      setSettleNote("");
      fetchTransactions(selectedPerson.id);
      fetchPersons();
    } catch (error: any) {
      setSettlePersonError(error.response?.data?.error || "Failed to settle balance");
    } finally {
      setSettleLoading(false);
    }
  };

  const handleUpiConfirmPayment = async () => {
    if (!selectedUpiPerson || !upiPaymentAmount || isNaN(Number(upiPaymentAmount)) || Number(upiPaymentAmount) <= 0) return;
    try {
      setSettleLoading(true);
      await api.post(`/transactions/person/${selectedUpiPerson.id}/settle`, {
        settleAmount: Number(upiPaymentAmount),
        note: "Paid via UPI"
      });

      setUpiPaymentStep("success");
      setTimeout(() => {
        setIsUpiPaymentModalOpen(false);
        setSelectedUpiPerson(null);
      }, 2500);

      if (selectedPerson && selectedPerson.id === selectedUpiPerson.id) {
        fetchTransactions(selectedPerson.id);
      }
      fetchPersons();
    } catch (error: any) {
      setUpiPaymentError(error.response?.data?.error || "Failed to record payment");
    } finally {
      setSettleLoading(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    try {
      await api.delete(`/transactions/${txId}`);
      setTransactions(prev => prev.filter(tx => tx.id !== txId));
      setSelectedTx(null);
      setTxToDelete(null);
      fetchPersons();
      toast.success("Transaction deleted successfully!");
    } catch (err: any) {
      console.error("Failed to delete transaction", err);
      toast.error(err.response?.data?.error || "Failed to delete transaction");
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
          <div className="sticky top-0 z-30 flex items-center gap-4 px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
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
                  <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full shadow-sm self-start animate-in zoom-in duration-300 ${selectedPerson.connection_status === "connected" ? "bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20" : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20"}`}>
                    <div className={`w-1 h-1 rounded-full animate-pulse ${selectedPerson.connection_status === "connected" ? "bg-blue-500" : "bg-emerald-500"}`}></div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${selectedPerson.connection_status === "connected" ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {selectedPerson.connection_status === "connected" ? "Connected" : "On App"}
                    </span>
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

          <div className={`px-5 mt-1 ${detailTab === "profile" ? "space-y-6" : ""}`}>

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
                  <div className="w-14 h-14 rounded-full border-2 border-indigo-500 shrink-0 bg-indigo-50 dark:bg-[#1e1a3b] flex items-center justify-center overflow-hidden">
                    {selectedPerson.connection_status === "connected" && selectedPerson.profile_picture ? (
                      <img src={selectedPerson.profile_picture} alt={selectedPerson.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{selectedPerson.name.charAt(0).toUpperCase()}</span>
                    )}
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
                            <button onClick={handleSendRequest} disabled={isSendingRequest} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                              {isSendingRequest ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} {isSendingRequest ? "Sending..." : "Send Request"}
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
                    {selectedPerson.connection_status === "connected" && (
                      <InfoRow 
                        icon={Mail} 
                        label="Email" 
                        value={selectedPerson.email || "Not provided"} 
                        onClick={() => {
                          if (selectedPerson.email) {
                            navigator.clipboard.writeText(selectedPerson.email);
                            toast.success("Email copied to clipboard");
                          }
                        }}
                      />
                    )}
                    {selectedPerson.connection_status === "connected" && (
                      <InfoRow icon={MapPin} label="Address" value={selectedPerson.address || "Not provided"} />
                    )}
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
                <div className="flex border-b border-gray-100 dark:border-gray-800 mb-4 relative">
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
                {/* Pending Balance & Settle Actions (Moved here) */}
                {(() => {
                  if (statusFilter !== "pending") return null;

                  const txs = transactions.filter(t => t.status === "pending");
                  const credit = txs.filter(t => t.type === 'credit').reduce((sum, t) => sum + Number(t.amount), 0);
                  const debit = txs.filter(t => t.type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0);
                  const netBalance = credit - debit;

                  if (netBalance === 0) return null;

                  return (
                    <div className="flex justify-between items-center gap-4 mt-0 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 animate-in zoom-in duration-300 px-2">
                      <div className="flex flex-col shrink-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                          {netBalance > 0 ? "You'll Get" : "You Owe"}
                        </span>
                        <span className={`text-xl font-black ${netBalance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {currencySymbol}{Math.abs(netBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {netBalance < 0 && selectedPerson.linked_user_id && selectedPerson.upi_id && (
                          <button
                            onClick={() => {
                              setSelectedUpiPerson(selectedPerson);
                              setUpiPaymentAmount(Math.abs(netBalance).toString());
                              setUpiPaymentMaxAmount(Math.abs(netBalance));
                              setUpiPaymentStep("enter_amount");
                              setUpiPaymentError(null);
                              setIsUpiPaymentModalOpen(true);
                            }}
                            className="px-4 sm:px-6 py-2.5 rounded-full bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-indigo-100/80 dark:hover:bg-indigo-500/20 transition-all active:scale-[0.98] flex justify-center items-center gap-1 shadow-sm"
                          >
                            Pay Now <ChevronRight size={14} className="-mr-1" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSettlePersonError(null);
                            setSettleAmount(Math.abs(netBalance).toString());
                            setSettleNote("");
                            setIsSettlePersonModalOpen(true);
                          }}
                          className="px-4 sm:px-6 py-2.5 rounded-full bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-indigo-100/80 dark:hover:bg-indigo-500/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-sm"
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  );
                })()}

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
                              <div className="flex items-center gap-2">
                                <MarqueeText
                                  text={tx.reason || (tx.type === "credit" ? "Credit" : "Debit")}
                                  className="text-sm font-bold text-gray-900 dark:text-white"
                                />
                                {tx.note?.includes("Old Transaction Auto-Added") && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-500/20 whitespace-nowrap">Old</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={11} className="text-gray-400 dark:text-gray-500 shrink-0" />
                                  <span>{formatDate(tx.date || tx.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[9px] font-medium text-gray-400/80 dark:text-gray-500/80 mt-0.5">
                                  <Clock size={10} className="text-gray-400/70 dark:text-gray-500/70 shrink-0" />
                                  <span>{formatTime(tx.date || tx.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <MarqueeText
                              text={`${tx.type === "credit" ? "+ " : "- "}${currencySymbol}${Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setEditErrors(prev => ({ ...prev, first_name: undefined }));
                        setEditForm({ ...editForm, first_name: e.target.value });
                      }}
                      placeholder="Enter first name"
                      error={editErrors.first_name}
                      required
                    />
                    <FloatingInput
                      icon={User}
                      label="Last Name"
                      name="last_name"
                      value={editForm.last_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setEditForm({ ...editForm, last_name: e.target.value });
                      }}
                      placeholder="Enter last name"
                    />
                  </div>

                  <FloatingInput
                    icon={Phone}
                    label="Phone Number"
                    name="phone"
                    value={editForm.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEditErrors(prev => ({ ...prev, phone: undefined }));
                      setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) });
                    }}
                    placeholder="Enter mobile number"
                    error={editErrors.phone}
                  />

                  {selectedPerson.connection_status === "connected" && selectedPerson.email && (
                    <div className="relative opacity-60">
                      <FloatingInput
                        icon={Mail}
                        label="Email Address"
                        name="email"
                        value={selectedPerson.email}
                        onChange={() => { }}
                        placeholder=""
                      />
                      <div className="absolute inset-0 z-10 cursor-not-allowed" title="Email is managed by the connected user"></div>
                    </div>
                  )}

                  {selectedPerson.connection_status === "connected" && selectedPerson.address && (
                    <div className="relative opacity-60">
                      <FloatingInput
                        icon={MapPin}
                        label="Address"
                        name="address"
                        value={selectedPerson.address}
                        onChange={() => { }}
                        placeholder=""
                      />
                      <div className="absolute inset-0 z-10 cursor-not-allowed" title="Address is managed by the connected user"></div>
                    </div>
                  )}

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
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(selectedTx.date || selectedTx.createdAt)}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{formatTime(selectedTx.date || selectedTx.createdAt)}</p>
                    </div>
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
                        openSettleModal(selectedTx);
                      }}
                      className="flex-[2] py-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black text-sm shadow-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <CheckCircle2 size={18} strokeWidth={3} />
                      Settle / Complete
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

          {/* Settle Transaction Modal */}
          {settleTx && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white/95 dark:bg-[#0c0d1e]/95 backdrop-blur-xl rounded-[2.5rem] p-6 max-w-sm w-full border border-indigo-100 dark:border-indigo-500/20 shadow-2xl animate-in zoom-in-95 duration-300 relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setSettleTx(null)}
                  className="absolute top-5 right-5 p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>

                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 text-center tracking-tight">
                  Settle Payment
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
                  How much are you settling for this transaction?
                </p>

                <form onSubmit={handleSettleSubmit} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 text-center">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Total Outstanding</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {currencySymbol}{Number(settleTx.amount) % 1 === 0 ? Math.round(Number(settleTx.amount)) : Number(settleTx.amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Amount Paid / Received</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-sm font-bold text-indigo-500">{currencySymbol}</span>
                      </div>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max={settleTx.amount}
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl pl-8 pr-4 py-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Paid in cash, GPay..."
                      value={settleNote}
                      onChange={(e) => setSettleNote(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-4 py-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSettleTx(null)}
                      className="w-1/3 h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={settleLoading}
                      className="flex-1 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black uppercase tracking-widest rounded-2xl text-xs disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
                    >
                      {settleLoading ? <Loader2 size={16} className="animate-spin" /> : "Confirm"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Settle Person Net Balance Modal */}
          {isSettlePersonModalOpen && selectedPerson && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-[#151624] rounded-[2rem] p-6 max-w-sm w-full border border-indigo-50/50 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-center mb-5">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <IndianRupee size={28} strokeWidth={2.5} />
                  </div>
                </div>

                <h3 className="text-xl font-black text-gray-900 dark:text-white text-center tracking-tight mb-2">
                  Settle Balance
                </h3>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-6 px-2">
                  Enter the amount to settle towards the net balance.
                </p>

                <form onSubmit={handleSettlePersonSubmit} className="space-y-4">
                  {settlePersonError && (
                    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle size={16} className="shrink-0" />
                      <p>{settlePersonError}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-black tracking-widest uppercase text-gray-400 dark:text-gray-500 block mb-2 px-1">
                      Amount ({currencySymbol})
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-bold text-lg">{currencySymbol}</span>
                      </div>
                      <input
                        type="number"
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-[#0a0a1a] text-gray-900 dark:text-white font-bold rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border border-gray-100 dark:border-gray-800 text-lg placeholder:text-gray-300 dark:placeholder:text-gray-700"
                        step="0.01"
                        min="0"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black tracking-widest uppercase text-gray-400 dark:text-gray-500 block mb-2 px-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={settleNote}
                      onChange={(e) => setSettleNote(e.target.value)}
                      placeholder="e.g. Paid in cash"
                      className="w-full px-4 py-4 bg-gray-50 dark:bg-[#0a0a1a] text-gray-900 dark:text-white font-bold rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border border-gray-100 dark:border-gray-800 text-sm placeholder:text-gray-300 dark:placeholder:text-gray-700"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsSettlePersonModalOpen(false)}
                      className="w-1/3 h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={settleLoading || !settleAmount || Number(settleAmount) <= 0}
                      className="flex-1 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black uppercase tracking-widest rounded-2xl text-xs disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
                    >
                      {settleLoading ? <Loader2 size={16} className="animate-spin" /> : "Confirm"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* UPI Payment Modal */}
          {isUpiPaymentModalOpen && selectedUpiPerson && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white/95 dark:bg-[#0c0d1e]/95 backdrop-blur-xl rounded-[2.5rem] p-6 max-w-sm w-full border border-indigo-100 dark:border-indigo-500/20 shadow-2xl animate-in zoom-in-95 duration-300 relative">
                <button
                  onClick={() => setIsUpiPaymentModalOpen(false)}
                  className="absolute top-5 right-5 p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>

                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 text-center tracking-tight">
                  Pay via UPI
                </h3>

                {upiPaymentStep === "enter_amount" ? (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
                      Paying <span className="font-bold text-gray-700 dark:text-gray-300">{selectedUpiPerson.name}</span>
                    </p>

                    {upiPaymentError && (
                      <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span className="font-medium">{upiPaymentError}</span>
                      </div>
                    )}

                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">
                          Amount to Pay
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-sm font-bold text-indigo-500">{currencySymbol}</span>
                          </div>
                          <input
                            type="number"
                            value={upiPaymentAmount}
                            onChange={(e) => setUpiPaymentAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-[#0a0a1a] text-gray-900 dark:text-white font-bold rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border border-gray-100 dark:border-gray-800 text-lg placeholder:text-gray-300 dark:placeholder:text-gray-700"
                            step="0.01"
                            min="0"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsUpiPaymentModalOpen(false)}
                          className="w-1/3 h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!upiPaymentAmount || Number(upiPaymentAmount) <= 0) {
                              setUpiPaymentError("Please enter a valid amount.");
                              return;
                            }

                            if (Number(upiPaymentAmount) > upiPaymentMaxAmount) {
                              setUpiPaymentError(`Cannot pay more than your total pending debit of ${currencySymbol}${upiPaymentMaxAmount.toLocaleString("en-IN")}.`);
                              return;
                            }

                            const upiParams = `pa=${selectedUpiPerson.upi_id}&pn=${encodeURIComponent(selectedUpiPerson.name)}&am=${Number(upiPaymentAmount).toFixed(2)}&cu=INR&tn=MoneyTrack%20Settle&tr=MT${Date.now()}`;
                            const fallbackUrl = encodeURIComponent(`upi://pay?${upiParams}`);
                            const gpayIntentUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=${fallbackUrl};end`;
                            
                            const link = document.createElement('a');
                            link.href = gpayIntentUrl;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);

                            // Change step
                            setUpiPaymentError(null);
                            setUpiPaymentStep("confirm_payment");
                          }}
                          className="flex-1 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black uppercase tracking-widest rounded-2xl text-[10px] sm:text-xs active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
                        >
                          Pay via UPI
                        </button>
                      </div>
                    </div>
                  </>
                ) : upiPaymentStep === "confirm_payment" ? (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
                      Did your payment of <span className="font-bold text-gray-700 dark:text-gray-300">{currencySymbol}{Number(upiPaymentAmount).toLocaleString("en-IN")}</span> succeed?
                    </p>

                    {upiPaymentError && (
                      <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span className="font-medium">{upiPaymentError}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={handleUpiConfirmPayment}
                        disabled={settleLoading}
                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl text-xs disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20 gap-2"
                      >
                        {settleLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Yes, Record Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsUpiPaymentModalOpen(false)}
                        disabled={settleLoading}
                        className="w-full h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                      >
                        No, Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 relative">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                      <CheckCircle2 size={40} className="text-emerald-500 drop-shadow-md animate-in slide-in-from-bottom-2 duration-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
                    <p className="text-sm font-medium text-gray-500 text-center">Your transaction has been recorded.</p>
                  </div>
                )}
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
            {bulkContacts.length > 0 ? (
              <div className="space-y-4 pb-28">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Selected Contacts ({bulkContacts.length})</h3>
                  <button onClick={() => setBulkContacts([])} className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors px-2 py-1 bg-rose-50 dark:bg-rose-500/10 rounded-lg">Clear All</button>
                </div>
                
                {bulkContacts.map((contact, index) => (
                  <div key={contact.id} className="p-4 rounded-2xl bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 shadow-sm relative group transition-all hover:border-indigo-100 dark:hover:border-indigo-500/30">
                    <button
                      onClick={() => setBulkContacts(prev => prev.filter(c => c.id !== contact.id))}
                      className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pr-8">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">First Name *</label>
                        <input
                          type="text"
                          value={contact.first_name}
                          onChange={(e) => {
                            const newContacts = [...bulkContacts];
                            newContacts[index].first_name = e.target.value;
                            newContacts[index].error = undefined;
                            setBulkContacts(newContacts);
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Last Name</label>
                        <input
                          type="text"
                          value={contact.last_name}
                          onChange={(e) => {
                            const newContacts = [...bulkContacts];
                            newContacts[index].last_name = e.target.value;
                            setBulkContacts(newContacts);
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                        />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        value={contact.phone_number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          const newContacts = [...bulkContacts];
                          newContacts[index].phone_number = val;
                          newContacts[index].error = undefined;
                          setBulkContacts(newContacts);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                      />
                    </div>
                    {contact.error && (
                      <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-1.5">
                        <AlertCircle size={10} className="shrink-0" />
                        {contact.error}
                      </p>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={handleImportContact}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle size={18} />
                  Add More Contacts
                </button>
              </div>
            ) : (
              <>
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
                  <FloatingInput icon={User} label="First Name *" name="first_name" placeholder="e.g. John" value={formData.first_name} onChange={handleChange} error={formErrors.first_name} />
                  <FloatingInput icon={User} label="Last Name" name="last_name" placeholder="e.g. Doe" value={formData.last_name} onChange={handleChange} />
                  <FloatingInput icon={Phone} label="Mobile Number *" name="phone_number" type="tel" placeholder="+91 00000 00000" value={formData.phone_number} onChange={handleChange} error={formErrors.phone_number} />
                  <FloatingInput icon={StickyNote} label="Notes (Optional)" name="notes" placeholder="Any extra info..." value={formData.notes} onChange={handleChange} />
                </form>
              </>
            )}
          </div>

          {/* Fixed Bottom Button Wrapper */}
          <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/90 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-50 mt-auto">
            <div className="max-w-4xl mx-auto w-full">
              {bulkContacts.length > 0 ? (
                <button
                  onClick={handleBulkSubmit}
                  disabled={bulkSubmitLoading || bulkContacts.length === 0}
                  className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]"
                >
                  {bulkSubmitLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span className="uppercase tracking-[0.1em] text-sm font-bold">
                        Save All Contacts ({bulkContacts.length})
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleAddSubmit}
                  disabled={submitLoading}
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
              )}
            </div>
          </div>
        </div>
        {justAddedPerson && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#151624] rounded-[2rem] p-6 max-w-sm w-full border border-indigo-50/50 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-300">
              {/* Decorative success animation (Indigo styled matching Money Track branding) */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm animate-bounce">
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
                  onClick={() => handleInvite("share")}
                  className="w-full h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-xs uppercase tracking-wider"
                >
                  <Share2 size={16} />
                  Share / Choose App
                </button>

                <button
                  onClick={() => handleInvite("whatsapp")}
                  className="w-full h-12 bg-[#25d366] hover:bg-[#20ba59] text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-xs uppercase tracking-wider"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.448L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.38 1.966 13.91 1.958 12.002 1.958 6.564 1.958 2.14 6.327 2.136 11.756c-.001 1.774.462 3.508 1.34 5.042l-1.012 3.7 3.793-.984zm11.305-6.763c-.305-.152-1.803-.889-2.083-.989-.28-.102-.485-.153-.687.152-.203.304-.787 1.002-.965 1.202-.178.203-.357.23-.662.077-1.127-.565-1.955-1.006-2.73-2.336-.195-.336-.195-.546-.043-.699.136-.137.305-.356.458-.533.152-.178.203-.304.305-.508.102-.203.05-.381-.025-.533-.076-.152-.687-1.657-.941-2.27-.247-.597-.5-.515-.687-.525l-.587-.01c-.203 0-.533.076-.812.381-.28.305-1.066 1.042-1.066 2.541 0 1.5 1.092 2.946 1.244 3.149.153.203 2.15 3.284 5.207 4.601.727.314 1.291.5 1.732.643.73.232 1.393.199 1.917.12.584-.087 1.803-.737 2.057-1.448.254-.71.254-1.32.178-1.448-.076-.127-.28-.203-.585-.355z" />
                  </svg>
                  Invite via WhatsApp
                </button>

                <button
                  onClick={() => handleInvite("sms")}
                  className="w-full h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                >
                  <MessageSquare size={16} />
                  Invite via SMS
                </button>

                <button
                  onClick={handleCloseInviteModal}
                  className="w-full text-center text-xs font-black tracking-widest uppercase text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-5 active:scale-95 transition-all py-2"
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

  // ---------------------------------------------------------
  // LIST VIEW SCREEN
  // ---------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto w-full font-sans transition-colors duration-300 pb-8">

      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
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

      <div className="px-5 mt-6 space-y-4">

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
              const netBalance = credit - debit;

              return (
                <div
                  key={person.id}
                  className="relative bg-slate-50 dark:bg-[#151624] rounded-[1.5rem] border border-slate-100 dark:border-gray-800/80 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all group flex flex-col overflow-hidden"
                >
                  {/* Top Section */}
                  <div
                    onClick={() => handlePersonClick(person, "profile")}
                    className="flex items-start justify-between p-5 pb-5 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-[1.2rem] bg-indigo-50 dark:bg-[#1b1c2e] text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition-transform shadow-sm overflow-hidden">
                        {person.connection_status === "connected" && person.profile_picture ? (
                          <img src={person.profile_picture} alt={person.name} className="w-full h-full object-cover" />
                        ) : (
                          person.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5 min-w-0 flex-1 mt-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <MarqueeText
                            text={person.name}
                            containerClassName="max-w-[120px] sm:max-w-[180px]"
                            className="text-base font-black text-gray-900 dark:text-white"
                          />
                        </div>
                        {person.phone && (
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide mt-0.5">
                            {person.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Side Status & Menu */}
                    <div className="absolute top-5 right-4 flex flex-col items-end gap-3.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(person.id);
                        }}
                        className="p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {person.linked_user_id ? (
                        person.connection_status === "connected" ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm animate-in zoom-in duration-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none text-blue-600 dark:text-blue-400">
                              Connected
                            </span>
                          </div>
                        ) : person.connection_status === "requested" ? (
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm animate-in zoom-in duration-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 cursor-default"
                          >
                            <Clock size={10} className="text-amber-600 dark:text-amber-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none text-amber-600 dark:text-amber-400">
                              Requested
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendRequest(person);
                            }}
                            disabled={isSendingRequest}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-sm animate-in zoom-in duration-300 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white transition-all border border-indigo-400/20 active:scale-95 disabled:opacity-50"
                          >
                            {isSendingRequest ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                              {isSendingRequest ? "Sending..." : "Send Request"}
                            </span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInviteApp(person);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-sm animate-in zoom-in duration-300 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white transition-all active:scale-95"
                        >
                          <UserPlus size={10} />
                          <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                            Invite to App
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary (Bottom Section) */}
                  <div
                    onClick={() => handlePersonClick(person, "transactions")}
                    className="bg-white dark:bg-[#1a1b2f] p-3 sm:p-4 cursor-pointer mt-auto"
                  >
                    <div className="flex items-center justify-between gap-3 py-3.5 px-4 rounded-[1.2rem] bg-white dark:bg-[#151624] border border-slate-100 dark:border-gray-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-3.5">
                        {/* Icon */}
                        {netBalance > 0 ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                          </div>
                        ) : netBalance < 0 ? (
                          <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                            <TrendingDown size={16} className="text-rose-600 dark:text-rose-400" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400 dark:text-slate-500">
                            <CheckCircle2 size={18} strokeWidth={2.5} />
                          </div>
                        )}

                        {/* Text Stack */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            Net Balance
                          </span>
                          <span className={`text-[9px] font-black tracking-widest uppercase ${netBalance > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : netBalance < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-400 dark:text-slate-500"
                            }`}>
                            {netBalance > 0 ? "You'll Get" : netBalance < 0 ? "You Owe" : "Settled"}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Amount & Chevron */}
                      <div className="flex items-center gap-2.5">
                        <span className={`text-base font-black tracking-tight ${netBalance > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : netBalance < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-600 dark:text-slate-400"
                          }`}>
                          {netBalance > 0 ? "+ " : netBalance < 0 ? "- " : ""}
                          {currencySymbol}
                          {Math.abs(netBalance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <ChevronRight size={18} className="text-gray-400 dark:text-gray-600 shrink-0 ml-1" />
                      </div>
                    </div>

                    {/* Pay Button Row */}
                    {netBalance < 0 && person.linked_user_id && person.upi_id && (
                      <div className="mt-3 flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUpiPerson(person);
                            setUpiPaymentAmount(Math.abs(netBalance).toString());
                            setUpiPaymentMaxAmount(Math.abs(netBalance));
                            setUpiPaymentStep("enter_amount");
                            setUpiPaymentError(null);
                            setIsUpiPaymentModalOpen(true);
                          }}
                          className="w-full sm:w-[80%] py-3 rounded-[1rem] bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
                        >
                          Pay Now <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
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
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(selectedTx.date || selectedTx.createdAt)}</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">{formatTime(selectedTx.date || selectedTx.createdAt)}</p>
                </div>
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
                    openSettleModal(selectedTx);
                  }}
                  className="flex-[2] py-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black text-sm shadow-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <CheckCircle2 size={18} strokeWidth={3} />
                  Settle / Complete
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
                    setTxToDelete(activeTxMenuId);
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

      {/* Delete Transaction Confirmation Drawer */}
      {txToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] animate-in fade-in duration-300 flex flex-col justify-end"
          onClick={() => setTxToDelete(null)}
        >
          <div
            className="bg-white dark:bg-[#151624] rounded-t-[2.5rem] p-5 sm:p-6 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300 sm:max-w-md sm:mx-auto sm:w-full sm:rounded-[2.5rem] sm:mb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Delete Transaction?</h3>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                This action cannot be undone. Are you sure you want to delete this transaction?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTxToDelete(null)}
                className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTransaction(txToDelete)}
                className="flex-1 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-500/30 transition-all active:scale-95"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {persons.length > 0 && location.state?.from !== "bottom_nav" && (
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
            {/* Decorative success animation (Indigo styled matching Money Track branding) */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm animate-bounce">
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
                className="w-full h-12 bg-[#25d366] hover:bg-[#20ba59] text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-xs uppercase tracking-wider"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.448L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.38 1.966 13.91 1.958 12.002 1.958 6.564 1.958 2.14 6.327 2.136 11.756c-.001 1.774.462 3.508 1.34 5.042l-1.012 3.7 3.793-.984zm11.305-6.763c-.305-.152-1.803-.889-2.083-.989-.28-.102-.485-.153-.687.152-.203.304-.787 1.002-.965 1.202-.178.203-.357.23-.662.077-1.127-.565-1.955-1.006-2.73-2.336-.195-.336-.195-.546-.043-.699.136-.137.305-.356.458-.533.152-.178.203-.304.305-.508.102-.203.05-.381-.025-.533-.076-.152-.687-1.657-.941-2.27-.247-.597-.5-.515-.687-.525l-.587-.01c-.203 0-.533.076-.812.381-.28.305-1.066 1.042-1.066 2.541 0 1.5 1.092 2.946 1.244 3.149.153.203 2.15 3.284 5.207 4.601.727.314 1.291.5 1.732.643.73.232 1.393.199 1.917.12.584-.087 1.803-.737 2.057-1.448.254-.71.254-1.32.178-1.448-.076-.127-.28-.203-.585-.355z" />
                </svg>
                Invite via WhatsApp
              </button>

              <button
                onClick={() => handleInvite("sms")}
                className="w-full h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                <MessageSquare size={16} />
                Invite via SMS
              </button>

              <button
                onClick={handleCloseInviteModal}
                className="w-full text-center text-xs font-black tracking-widest uppercase text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-5 active:scale-95 transition-all py-2"
              >
                Skip & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Transaction Modal */}
      {settleTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-[#0c0d1e]/95 backdrop-blur-xl rounded-[2.5rem] p-6 max-w-sm w-full border border-indigo-100 dark:border-indigo-500/20 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <button
              onClick={() => setSettleTx(null)}
              className="absolute top-5 right-5 p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 text-center tracking-tight">
              Settle Payment
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
              How much are you settling for this transaction?
            </p>

            <form onSubmit={handleSettleSubmit} className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 text-center">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Total Outstanding</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {currencySymbol}{Number(settleTx.amount) % 1 === 0 ? Math.round(Number(settleTx.amount)) : Number(settleTx.amount).toFixed(2)}
                </span>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Amount Paid / Received</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-sm font-bold text-indigo-500">{currencySymbol}</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={settleTx.amount}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl pl-8 pr-4 py-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash, GPay..."
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-4 py-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleTx(null)}
                  className="w-1/3 h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleLoading}
                  className="flex-1 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black uppercase tracking-widest rounded-2xl text-xs disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
                >
                  {settleLoading ? <Loader2 size={16} className="animate-spin" /> : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI Payment Modal */}
      {isUpiPaymentModalOpen && selectedUpiPerson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-[#0c0d1e]/95 backdrop-blur-xl rounded-[2.5rem] p-6 max-w-sm w-full border border-indigo-100 dark:border-indigo-500/20 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <button
              onClick={() => setIsUpiPaymentModalOpen(false)}
              className="absolute top-5 right-5 p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 text-center tracking-tight">
              Pay via UPI
            </h3>

            {upiPaymentStep === "enter_amount" ? (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
                  Paying <span className="font-bold text-gray-700 dark:text-gray-300">{selectedUpiPerson.name}</span>
                </p>

                {upiPaymentError && (
                  <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span className="font-medium">{upiPaymentError}</span>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">
                      Amount to Pay
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-sm font-bold text-indigo-500">{currencySymbol}</span>
                      </div>
                      <input
                        type="number"
                        value={upiPaymentAmount}
                        onChange={(e) => setUpiPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-[#0a0a1a] text-gray-900 dark:text-white font-bold rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border border-gray-100 dark:border-gray-800 text-lg placeholder:text-gray-300 dark:placeholder:text-gray-700"
                        step="0.01"
                        min="0"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsUpiPaymentModalOpen(false)}
                      className="w-1/3 h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!upiPaymentAmount || Number(upiPaymentAmount) <= 0) {
                          setUpiPaymentError("Please enter a valid amount.");
                          return;
                        }

                        if (Number(upiPaymentAmount) > upiPaymentMaxAmount) {
                          setUpiPaymentError(`Cannot pay more than your total pending debit of ${currencySymbol}${upiPaymentMaxAmount.toLocaleString("en-IN")}.`);
                          return;
                        }

                        const upiParams = `pa=${selectedUpiPerson.upi_id}&pn=${encodeURIComponent(selectedUpiPerson.name)}&am=${Number(upiPaymentAmount).toFixed(2)}&cu=INR`;
                        const fallbackUrl = encodeURIComponent(`upi://pay?${upiParams}`);
                        const gpayIntentUrl = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=${fallbackUrl};end`;
                        
                        const link = document.createElement('a');
                        link.href = gpayIntentUrl;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // Change step
                        setUpiPaymentError(null);
                        setUpiPaymentStep("confirm_payment");
                      }}
                      className="flex-1 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black uppercase tracking-widest rounded-2xl text-[10px] sm:text-xs active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
                    >
                      Pay via UPI
                    </button>
                  </div>
                </div>
              </>
            ) : upiPaymentStep === "confirm_payment" ? (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
                  Did your payment of <span className="font-bold text-gray-700 dark:text-gray-300">{currencySymbol}{Number(upiPaymentAmount).toLocaleString("en-IN")}</span> succeed?
                </p>

                {upiPaymentError && (
                  <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span className="font-medium">{upiPaymentError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleUpiConfirmPayment}
                    disabled={settleLoading}
                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl text-xs disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20 gap-2"
                  >
                    {settleLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    Yes, Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUpiPaymentModalOpen(false)}
                    disabled={settleLoading}
                    className="w-full h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                  >
                    No, Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                  <CheckCircle2 size={40} className="text-emerald-500 drop-shadow-md animate-in slide-in-from-bottom-2 duration-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
                <p className="text-sm font-medium text-gray-500 text-center">Your transaction has been recorded.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Person;
