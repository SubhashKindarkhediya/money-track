import React, { useState, useEffect } from "react";
import { ArrowLeft, User, TrendingUp, TrendingDown, IndianRupee, FileText, Clock, ChevronDown, CheckCircle2, Check, X, Users, CalendarDays } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import MarqueeText from "../components/MarqueeText";
import toast from "react-hot-toast";

const AddTransaction: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedPersonId = location.state?.personId;
  const preSelectedPersonName = location.state?.personName;

  const editingTx = location.state?.editingTx;
  const isEditing = !!editingTx;

  const [persons, setPersons] = useState<{ id: string; name: string; phone?: string }[]>([]);
  const [txForm, setTxForm] = useState({
    person_id: editingTx?.person_id || preSelectedPersonId || "",
    type: editingTx?.type || location.state?.type || "credit",
    amount: editingTx?.amount?.toString() || "",
    reason: editingTx?.reason || "",
    date: editingTx?.date ? new Date(editingTx.date).toISOString().split('T')[0] : "",
    category: editingTx?.category || "",
    status: editingTx?.status || location.state?.status || (location.state?.type === "expense" || location.state?.type === "income" ? "completed" : "pending")
  });
  const [txLoading, setTxLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [errors, setErrors] = useState<{ person?: string; amount?: string; reason?: string; date?: string }>({});

  const [searchQuery, setSearchQuery] = useState(preSelectedPersonName || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "group">(location.state?.mode || "single");
  const [selectedPersons, setSelectedPersons] = useState<{ id: string; name: string }[]>([]);
  const [paidBy, setPaidBy] = useState<string>("me");

  const totalAmountValue = parseFloat(txForm.amount) || 0;
  const totalParticipants = selectedPersons.length + 1; // Always include the user
  const perPersonAmount = totalParticipants > 0 ? (totalAmountValue / totalParticipants).toFixed(2) : "0.00";

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

  // Filter persons based on search query
  const filteredPersons = persons.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone && p.phone.includes(searchQuery))
  );

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const res = await api.get("/person");
        setPersons(res.data);
      } catch (err) {
        console.error("Failed to fetch persons", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPersons();
  }, []);

  // Auto-scroll when dropdown opens
  useEffect(() => {
    if (isStatusDropdownOpen) {
      setTimeout(() => {
        const spacer = document.getElementById("dropdown-spacer");
        spacer?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [isStatusDropdownOpen]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation
    const newErrors: { person?: string; amount?: string; reason?: string; date?: string } = {};
    let isValid = true;

    const isPersonalTx = txForm.type === "expense" || txForm.type === "income";

    if (!isPersonalTx) {
      if (mode === "single" && !txForm.person_id) {
        newErrors.person = "Please select a person";
        isValid = false;
      } else if (mode === "group" && selectedPersons.length === 0) {
        newErrors.person = "Please select at least one person";
        isValid = false;
      }
    }

    if (!txForm.amount || parseFloat(txForm.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
      isValid = false;
    }

    if (!txForm.reason || txForm.reason.trim() === "") {
      newErrors.reason = "Please enter a description";
      isValid = false;
    }

    if (txForm.date) {
      const selectedDate = new Date(txForm.date);
      const today = new Date();
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        newErrors.date = "Future dates are not allowed";
        isValid = false;
      }
    }

    setErrors(newErrors);
    if (!isValid) return;

    let finalDate = txForm.date || undefined;
    if (finalDate) {
      if (isEditing && editingTx?.date && finalDate === new Date(editingTx.date).toISOString().split('T')[0]) {
        // Keep original time if date wasn't changed
        finalDate = editingTx.date;
      } else if (finalDate.length === 10) {
        // Append current local time to the selected date
        const now = new Date();
        const [year, month, day] = finalDate.split('-');
        const localDate = new Date(Number(year), Number(month) - 1, Number(day), now.getHours(), now.getMinutes(), now.getSeconds());
        finalDate = localDate.toISOString();
      }
    }

    try {
      setTxLoading(true);

      if (mode === "single") {
        if (isEditing) {
          await api.put(`/transactions/${editingTx.id}`, {
            amount: parseFloat(txForm.amount),
            category: txForm.category || undefined,
            reason: txForm.reason || undefined,
            date: finalDate,
            status: isPersonalTx ? "completed" : txForm.status,
            type: txForm.type,
          });
        } else {
          await api.post("/transactions", {
            person_id: isPersonalTx ? undefined : txForm.person_id,
            type: txForm.type,
            amount: parseFloat(txForm.amount),
            category: txForm.category || undefined,
            reason: txForm.reason || undefined,
            date: finalDate,
            status: isPersonalTx ? "completed" : txForm.status,
          });
        }
      } else {
        // Group transaction logic
        const amountPerPerson = parseFloat(perPersonAmount);

        if (paidBy === "me") {
          // I paid for everyone else -> Create a CREDIT for each selected person
          // (User's logic: I will receive this money back)
          const promises = selectedPersons.map(p =>
            api.post("/transactions", {
              person_id: p.id,
              type: "credit",
              amount: amountPerPerson,
              category: txForm.category || undefined,
              reason: txForm.reason ? `${txForm.reason} (Group Split)` : "Group Expense Split",
              date: finalDate,
              status: "pending",
            })
          );

          // Also record the user's own share as a personal expense
          const expensePromise = api.post("/transactions", {
            person_id: undefined,
            type: "expense",
            amount: amountPerPerson,
            category: txForm.category || undefined,
            reason: txForm.reason ? `${txForm.reason} (My Share)` : "Group Expense (My Share)",
            date: finalDate,
            status: "completed",
          });

          await Promise.all([...promises, expensePromise]);
        } else {
          // Someone else paid for me -> Create a SINGLE DEBIT for that person
          // (User's logic: I owe this person)
          await api.post("/transactions", {
            person_id: paidBy,
            type: "debit",
            amount: amountPerPerson,
            category: txForm.category || undefined,
            reason: txForm.reason ? `${txForm.reason} (Group Split)` : "Group Expense Split",
            date: finalDate,
            status: "pending",
          });
        }
      }

      if (isEditing) {
        toast.success("Transaction updated successfully!");
      } else {
        toast.success("Transaction added successfully!");
      }

      if (isPersonalTx) {
        navigate("/personal-history");
      } else if (mode === "single" && txForm.person_id) {
        navigate(`/person/${txForm.person_id}`, { state: { tab: "transactions", status: txForm.status } });
      } else {
        navigate("/");
      }
    } catch (err: any) {
      console.error("Failed to add transaction", err);
      toast.error(err?.response?.data?.error || "Failed to save transaction");
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-white dark:bg-[#0a0a1a]">
      <div className="max-w-4xl mx-auto w-full font-sans animate-in slide-in-from-bottom-6 duration-300 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 flex items-center gap-4 px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
          <button
            type="button"
            onClick={() => {
              if (preSelectedPersonId) {
                navigate(`/person/${preSelectedPersonId}?tab=transactions`);
              } else {
                navigate(-1);
                // Smart fallback in case navigate(-1) does not fire due to history refresh
                setTimeout(() => {
                  if (window.location.pathname === "/add-transaction") {
                    navigate("/");
                  }
                }, 100);
              }
            }}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
          >
            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-base font-black text-gray-900 dark:text-white tracking-wide">
            {isEditing
              ? `Update ${txForm.type === "expense" ? "Expense" : txForm.type === "income" ? "Income" : "Transaction"}`
              : `New ${txForm.type === "expense" ? "Expense" : txForm.type === "income" ? "Income" : "Transaction"}`}
          </h2>
        </div>

        {/* Transaction Mode Tabs - Only show if not coming from a specific person's profile, not editing, and not personal tx */}
        {!preSelectedPersonId && !isEditing && txForm.type !== "expense" && txForm.type !== "income" && (
          <div className="flex border-b border-indigo-100/30 dark:border-gray-800/50 bg-white/50 dark:bg-[#151624]/30">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex-1 py-4 text-sm font-black transition-all relative ${mode === "single" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
                }`}
            >
              Single
              {mode === "single" && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.3)]" />
              )}
            </button>
            <div className="w-px bg-indigo-100/20 dark:bg-gray-800/50 my-4" />
            <button
              type="button"
              onClick={() => setMode("group")}
              className={`flex-1 py-4 text-sm font-black transition-all relative ${mode === "group" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
                }`}
            >
              Group
              {mode === "group" && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.3)]" />
              )}
            </button>
          </div>
        )}

        {/* Personal Transaction Tabs - Expense vs Income */}
        {!isEditing && (txForm.type === "expense" || txForm.type === "income") && (
          <div className="flex border-b border-indigo-100/30 dark:border-gray-800/50 bg-white/50 dark:bg-[#151624]/30">
            <button
              type="button"
              onClick={() => setTxForm({ ...txForm, type: "expense" })}
              className={`flex-1 py-4 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${txForm.type === "expense" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}
            >
              Add Expense
              {txForm.type === "expense" && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-amber-500 rounded-t-full shadow-[0_-2px_10px_rgba(245,158,11,0.3)]" />
              )}
            </button>
            <div className="w-px bg-indigo-100/20 dark:bg-gray-800/50 my-4" />
            <button
              type="button"
              onClick={() => setTxForm({ ...txForm, type: "income" })}
              className={`flex-1 py-4 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${txForm.type === "income" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}
            >
              Add Income
              {txForm.type === "income" && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-500 rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.3)]" />
              )}
            </button>
          </div>
        )}

        <div className="px-5 mt-8 space-y-6 pb-20">
          <form onSubmit={handleAddTransaction} className="space-y-6 relative">
            {mode === "single" ? (
              <>
                {/* Title for Single Transaction - Hide if person is pre-selected or if personal tx */}
                {!preSelectedPersonId && txForm.type !== "expense" && txForm.type !== "income" && (
                  <div className="flex justify-center mb-2">
                    <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-500/20 shadow-sm shadow-indigo-500/5">
                      Single Transaction
                    </h3>
                  </div>
                )}

                {/* Person Selector (Searchable) - Only show if not pre-selected and not a personal tx */}
                {txForm.type !== "expense" && txForm.type !== "income" && (
                  !preSelectedPersonId ? (
                    <div className="relative z-20">
                      <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2 px-1">Search Person</label>
                      <div className="relative">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          required={!txForm.person_id && mode === "single"}
                          placeholder="Type to search contacts..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsDropdownOpen(true);
                            setTxForm({ ...txForm, person_id: "" }); // Reset selected person when typing
                            if (errors.person) setErrors({ ...errors, person: undefined });
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          className={`w-full pl-11 pr-4 py-4 bg-white dark:bg-[#151624] border ${errors.person ? 'border-rose-500 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10'} rounded-2xl outline-none focus:ring-2 text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm placeholder:transition-opacity focus:placeholder:opacity-0`}
                        />
                        <ChevronDown size={18} className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} pointer-events-none`} />
                      </div>
                      {errors.person && <p className="text-rose-500 text-[11px] font-bold mt-1.5 px-1 animate-in fade-in">{errors.person}</p>}

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                          <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-indigo-900/10 overflow-hidden max-h-60 overflow-y-auto">
                            {filteredPersons.length > 0 ? (
                              filteredPersons.map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setTxForm({ ...txForm, person_id: p.id });
                                    setSearchQuery(p.name);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between ${txForm.person_id === p.id
                                    ? 'bg-indigo-50 dark:bg-[#1b1c2e] text-indigo-700 dark:text-indigo-400 font-bold'
                                    : 'hover:bg-gray-50 dark:hover:bg-[#1b1c2e] text-gray-700 dark:text-gray-300 font-medium'
                                    }`}
                                >
                                  <span>{p.name}</span>
                                  {p.phone && <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">{p.phone}</span>}
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                                No contacts found matching "{searchQuery}"
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {loading && <p className="text-xs text-indigo-500 mt-2 font-medium px-1 animate-pulse">Loading contacts...</p>}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl">
                        {preSelectedPersonName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                          {isEditing ? "Updating transaction for" : "Adding transaction for"}
                        </p>
                        <MarqueeText
                          text={preSelectedPersonName || ""}
                          className="text-lg font-black text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )
                )}

                {/* Type Toggle */}
                {(txForm.type === "credit" || txForm.type === "debit") && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2 px-1">Transaction Type</label>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setTxForm({ ...txForm, type: "credit" })}
                        className={`flex-1 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${txForm.type === "credit"
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20 ring-offset-2 dark:ring-offset-[#0a0a1a]"
                          : "bg-white dark:bg-[#151624] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1e1f30]"
                          }`}>
                        <TrendingUp size={18} />
                        <span>
                          Credit
                          <span className={`text-[10px] ml-1 opacity-70 font-medium ${txForm.type === "credit" ? "text-emerald-50" : "text-gray-400"}`}>
                            (Received)
                          </span>
                        </span>
                      </button>
                      <button type="button" onClick={() => setTxForm({ ...txForm, type: "debit" })}
                        className={`flex-1 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${txForm.type === "debit"
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-500/20 ring-offset-2 dark:ring-offset-[#0a0a1a]"
                          : "bg-white dark:bg-[#151624] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1e1f30]"
                          }`}>
                        <TrendingDown size={18} />
                        <span>
                          Debit
                          <span className={`text-[10px] ml-1 opacity-70 font-medium ${txForm.type === "debit" ? "text-rose-50" : "text-gray-400"}`}>
                            (Given)
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}



                {/* Amount and Category Wrapper for Ordering */}
                <div className="flex flex-col gap-6 w-full">


                  {/* Amount */}
                  <div className={`${txForm.type === 'income' ? 'order-2' : 'order-1'}`}>
                    <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2 px-1">Amount</label>
                    <div className="relative">
                      <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="number" placeholder="0.00" required value={txForm.amount}
                        onChange={e => { setTxForm({ ...txForm, amount: e.target.value }); if (errors.amount) setErrors({ ...errors, amount: undefined }); }}
                        className={`w-full pl-11 pr-4 py-4 bg-white dark:bg-[#151624] border ${errors.amount ? 'border-rose-500 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10'} rounded-2xl outline-none focus:ring-2 text-lg font-black text-gray-900 dark:text-white transition-all shadow-sm placeholder:transition-opacity focus:placeholder:opacity-0`} />
                    </div>
                    {errors.amount && <p className="text-rose-500 text-[11px] font-bold mt-1.5 px-1 animate-in fade-in">{errors.amount}</p>}
                  </div>

                  {/* Category for Income/Expense */}
                  {(txForm.type === "expense" || txForm.type === "income") && (
                    <div className={`animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-30 ${txForm.type === 'income' ? 'order-1' : 'order-2'}`}>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                        {txForm.type === 'income' ? 'Category' : 'Payment Type'}
                      </label>
                      <div className="relative">
                        {!isCustomCategory ? (
                          <>
                            <div
                              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                              className={`w-full px-4 py-4 bg-white dark:bg-[#151624] border ${isCategoryDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-200 dark:border-gray-800'} rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-sm`}
                            >
                              <span className={`text-base font-bold ${!txForm.category ? "text-gray-400" : "text-gray-900 dark:text-white"}`}>
                                {txForm.category || (txForm.type === 'income' ? "Select Category..." : "Select Payment Type...")}
                              </span>
                              <ChevronDown size={18} className={`text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isCategoryDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsCategoryDropdownOpen(false)} />
                                <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-indigo-900/10 overflow-hidden">
                                  {(txForm.type === 'income'
                                    ? ["Salary", "Business", "Freelance", "Investment", "Gift"]
                                    : ["CASH", "ONLINE", "UPI", "CARD", "BANK TRANSFER"]
                                  ).map(cat => (
                                    <div
                                      key={cat}
                                      onClick={() => {
                                        if (txForm.category === cat) {
                                          setTxForm({ ...txForm, category: "" }); // Unselect if already selected
                                        } else {
                                          setTxForm({ ...txForm, category: cat });
                                        }
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className={`px-4 py-3 cursor-pointer transition-colors ${txForm.category === cat
                                        ? 'bg-indigo-50 dark:bg-[#1b1c2e] text-indigo-700 dark:text-indigo-400 font-bold'
                                        : 'hover:bg-gray-50 dark:hover:bg-[#1b1c2e] text-gray-700 dark:text-gray-300 font-medium'
                                        }`}
                                    >
                                      {cat}
                                    </div>
                                  ))}
                                  <div
                                    onClick={() => {
                                      setIsCustomCategory(true);
                                      setTxForm({ ...txForm, category: "" });
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className="px-4 py-3 cursor-pointer transition-colors border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1b1c2e] text-indigo-600 dark:text-indigo-400 font-bold"
                                  >
                                    Other (Type custom)
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="relative flex items-center w-full">
                            <input
                              type="text"
                              placeholder={txForm.type === 'income' ? "Enter custom category" : "Enter payment type"}
                              value={txForm.category || ""}
                              onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                              className={`w-full pr-12 pl-4 py-4 bg-white dark:bg-[#151624] border border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-2xl outline-none focus:ring-2 text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm`}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomCategory(false);
                                setTxForm({ ...txForm, category: "" });
                              }}
                              className="absolute right-2 p-2 text-gray-400 hover:text-rose-500 rounded-full transition-colors bg-gray-50 dark:bg-[#1e1f30] mr-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Description</label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="What was this for?" value={txForm.reason}
                      onChange={e => { setTxForm({ ...txForm, reason: e.target.value }); if (errors.reason) setErrors({ ...errors, reason: undefined }); }}
                      className={`w-full pl-11 pr-4 py-4 bg-white dark:bg-[#151624] border ${errors.reason ? 'border-rose-500 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10'} rounded-2xl outline-none focus:ring-2 text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm placeholder:transition-opacity focus:placeholder:opacity-0`} />
                  </div>
                  {errors.reason && <p className="text-rose-500 text-[11px] font-bold mt-1.5 px-1 animate-in fade-in">{errors.reason}</p>}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Date</label>
                  <div className="relative">
                    <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />

                    {/* Visible Formatted Text Input */}
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={formatDateToDDMMYYYY(txForm.date)}
                      readOnly
                      className={`w-full pl-11 pr-12 py-4 bg-white dark:bg-[#151624] border ${errors.date ? 'border-rose-500 focus:ring-rose-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10'} rounded-2xl outline-none focus:ring-2 text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm cursor-pointer placeholder:transition-opacity focus:placeholder:opacity-0`}
                    />

                    {/* Invisible Native Date Picker */}
                    <input
                      type="date"
                      value={txForm.date}
                      max={getLocalTodayString()}
                      onChange={e => { setTxForm({ ...txForm, date: e.target.value }); if (errors.date) setErrors({ ...errors, date: undefined }); }}
                      onClick={(e) => {
                        try {
                          if ('showPicker' in HTMLInputElement.prototype) {
                            e.currentTarget.showPicker();
                          } else {
                            e.currentTarget.focus();
                          }
                        } catch (err) { }
                      }}
                      className="absolute inset-0 w-full h-full opacity-[0.01] cursor-pointer z-20"
                    />

                    <CalendarDays size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                  </div>
                  {errors.date && <p className="text-rose-500 text-[11px] font-bold mt-1.5 px-1 animate-in fade-in">{errors.date}</p>}
                </div>

                {/* Status Dropdown - Hide if personal tx */}
                {txForm.type !== "expense" && txForm.type !== "income" && (
                  <>
                    <div className="relative z-10">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Transaction Status</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className="w-full px-5 py-4 bg-white dark:bg-[#151624] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm flex items-center justify-between hover:border-indigo-500/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${txForm.status === "pending" ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-indigo-600 shadow-lg shadow-indigo-600/30"}`}>
                              <Check size={14} className="text-white" strokeWidth={4} />
                            </div>
                            <span className="capitalize">{txForm.status}</span>
                          </div>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isStatusDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)}></div>
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 rounded-[1.8rem] shadow-2xl z-[55] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                              <button
                                type="button"
                                onClick={() => { setTxForm({ ...txForm, status: "pending" }); setIsStatusDropdownOpen(false); }}
                                className="w-full px-5 py-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#1e1f30] transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${txForm.status === "pending" ? "border-amber-500 bg-amber-500 shadow-md shadow-amber-500/20" : "border-gray-300 dark:border-gray-700"}`}>
                                    {txForm.status === "pending" && <Check size={14} className="text-white" strokeWidth={4} />}
                                  </div>
                                  <span className={`text-sm font-bold ${txForm.status === "pending" ? "text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-gray-400"}`}>Pending</span>
                                </div>
                              </button>
                              <div className="h-px bg-gray-50 dark:bg-gray-800/50 mx-4"></div>
                              <button
                                type="button"
                                onClick={() => { setTxForm({ ...txForm, status: "completed" }); setIsStatusDropdownOpen(false); }}
                                className="w-full px-5 py-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#1e1f30] transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${txForm.status === "completed" ? "border-indigo-600 bg-indigo-600 shadow-md shadow-indigo-600/20" : "border-gray-300 dark:border-gray-700"}`}>
                                    {txForm.status === "completed" && <Check size={14} className="text-white" strokeWidth={4} />}
                                  </div>
                                  <span className={`text-sm font-bold ${txForm.status === "completed" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400"}`}>Completed</span>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Spacer with ID for auto-scroll (Increased height to prevent cutting) */}
                    {isStatusDropdownOpen && <div id="dropdown-spacer" className="h-64 animate-in fade-in duration-300" />}
                  </>
                )}
              </>
            ) : (
              <>
                {/* Title for Group Transaction */}
                <div className="flex justify-center mb-2">
                  <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-full border border-amber-100 dark:border-amber-500/20 shadow-sm shadow-amber-500/5">
                    Group Transaction
                  </h3>
                </div>

                <div className="space-y-6">
                  {/* Multi-Person Selector */}
                  <div className="relative z-20">
                    <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2 px-1">Select People</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search and add multiple people..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        className={`w-full pl-11 pr-4 py-4 bg-white dark:bg-[#151624] border ${errors.person ? 'border-amber-500 focus:ring-amber-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-amber-500 focus:ring-amber-500/10'} rounded-2xl outline-none focus:ring-2 text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm placeholder:transition-opacity focus:placeholder:opacity-0`}
                      />
                      <ChevronDown size={18} className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} pointer-events-none`} />
                    </div>
                    {errors.person && <p className="text-amber-500 text-[11px] font-bold mt-1.5 px-1 animate-in fade-in">{errors.person}</p>}

                    {/* Selected Persons Chips */}
                    {selectedPersons.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 px-1">
                        {selectedPersons.map(p => (
                          <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl animate-in zoom-in-95 duration-200 max-w-[150px]">
                            <MarqueeText
                              text={p.name}
                              className="text-xs font-bold text-amber-700 dark:text-amber-400"
                            />
                            <button
                              type="button"
                              onClick={() => setSelectedPersons(selectedPersons.filter(sp => sp.id !== p.id))}
                              className="p-0.5 hover:bg-amber-200 dark:hover:bg-amber-500/20 rounded-full transition-colors"
                            >
                              <X size={12} className="text-amber-600 dark:text-amber-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-amber-900/10 overflow-hidden max-h-60 overflow-y-auto">
                          {filteredPersons.length > 0 ? (
                            filteredPersons
                              .filter(p => !selectedPersons.some(sp => sp.id === p.id)) // Hide already selected
                              .map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setSelectedPersons([...selectedPersons, { id: p.id, name: p.name }]);
                                    setSearchQuery("");
                                    setIsDropdownOpen(false);
                                  }}
                                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1b1c2e] text-gray-700 dark:text-gray-300 font-medium transition-colors flex items-center justify-between"
                                >
                                  <span>{p.name}</span>
                                  {p.phone && <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">{p.phone}</span>}
                                </div>
                              ))
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
                              No more contacts found
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Total Amount Input (Group Mode) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-widest mb-2 px-1">Total Bill Amount</label>
                    <div className="relative">
                      <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        placeholder="0.00"
                        required
                        value={txForm.amount}
                        onChange={e => { setTxForm({ ...txForm, amount: e.target.value }); if (errors.amount) setErrors({ ...errors, amount: undefined }); }}
                        className={`w-full pl-11 pr-4 py-4 bg-white dark:bg-[#151624] border ${errors.amount ? 'border-amber-500 focus:ring-amber-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-amber-500 focus:ring-amber-500/10'} rounded-2xl outline-none focus:ring-2 text-lg font-black text-gray-900 dark:text-white transition-all shadow-sm placeholder:transition-opacity focus:placeholder:opacity-0`}
                      />
                    </div>
                    {errors.amount && <p className="text-amber-500 text-[11px] font-bold mt-1.5 px-1 animate-in fade-in">{errors.amount}</p>}
                  </div>

                  {/* Who Paid Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-widest mb-3 px-1">Who Paid for this Bill?</label>
                    <div className="flex flex-wrap gap-2 px-1">
                      {/* Me Option */}
                      <button
                        type="button"
                        onClick={() => setPaidBy("me")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all ${paidBy === "me"
                          ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                          : "bg-white dark:bg-[#151624] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-amber-500/50"
                          }`}
                      >
                        <User size={14} />
                        Me
                      </button>

                      {/* Other Selected Persons */}
                      {selectedPersons.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPaidBy(p.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all ${paidBy === p.id
                            ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                            : "bg-white dark:bg-[#151624] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-amber-500/50"
                            }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[8px]">
                            {p.name.charAt(0)}
                          </div>
                          {p.name}
                        </button>
                      ))}

                      {selectedPersons.length === 0 && (
                        <div className="text-[10px] text-gray-400 font-medium py-2">
                          Add more people to select them as payer
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Split Amount (Read Only) */}
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <div className={`p-5 rounded-[2rem] border-2 border-dashed transition-all ${paidBy === 'me'
                      ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20"
                      : "bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20"
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${paidBy === 'me' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {paidBy === 'me' ? "Everyone owes you (Credit)" : `You owe ${selectedPersons.find(p => p.id === paidBy)?.name || 'them'} (Debit)`}
                        </label>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-full">
                          <Users size={10} className="text-gray-600 dark:text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{totalParticipants} Participants</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee size={24} className="text-gray-400 dark:text-gray-600" />
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{perPersonAmount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description (Group Mode) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Description</label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="What was this for?" value={txForm.reason}
                        onChange={e => { setTxForm({ ...txForm, reason: e.target.value }); if (errors.reason) setErrors({ ...errors, reason: undefined }); }}
                        className={`w-full pl-11 pr-4 py-4 bg-white dark:bg-[#151624] border ${errors.reason ? 'border-amber-500 focus:ring-amber-500/10' : 'border-gray-200 dark:border-gray-800 focus:border-amber-500 focus:ring-amber-500/10'} rounded-2xl outline-none focus:ring-2 text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm placeholder:transition-opacity focus:placeholder:opacity-0`} />
                    </div>
                    {errors.reason && <p className="text-amber-500 text-[11px] font-bold mt-1.5 px-1 animate-in fade-in">{errors.reason}</p>}
                  </div>

                  {/* Date (Group Mode) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Date</label>
                    <div className="relative">
                      <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />

                      {/* Visible Formatted Text Input */}
                      <input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={formatDateToDDMMYYYY(txForm.date)}
                        readOnly
                        className="w-full pl-11 pr-12 py-4 bg-white dark:bg-[#151624] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm cursor-pointer placeholder:transition-opacity focus:placeholder:opacity-0"
                      />

                      {/* Invisible Native Date Picker */}
                      <input
                        type="date"
                        value={txForm.date}
                        onChange={e => setTxForm({ ...txForm, date: e.target.value })}
                        onClick={(e) => {
                          try {
                            if ('showPicker' in HTMLInputElement.prototype) {
                              e.currentTarget.showPicker();
                            } else {
                              e.currentTarget.focus();
                            }
                          } catch (err) { }
                        }}
                        className="absolute inset-0 w-full h-full opacity-[0.01] cursor-pointer z-20"
                      />

                      <CalendarDays size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                    </div>
                  </div>

                  {/* Forced Pending Status Info */}
                  <div className="flex items-center gap-3 px-5 py-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Clock size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Transaction Status</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Forced to Pending</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Fixed Bottom Button */}
        <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-50 mt-auto">
          <button
            onClick={handleAddTransaction}
            disabled={txLoading}
            className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] tracking-wide"
          >
            {txLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span className="uppercase tracking-[0.1em] text-sm font-bold">
                  {isEditing
                    ? `Update ${txForm.type === "expense" ? "Expense" : txForm.type === "income" ? "Income" : "Transaction"}`
                    : `Save ${txForm.type === "expense" ? "Expense" : txForm.type === "income" ? "Income" : "Transaction"}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransaction;
