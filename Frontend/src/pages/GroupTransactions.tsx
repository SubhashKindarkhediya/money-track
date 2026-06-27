import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, PlusCircle, Loader2, Clock, History as HistoryIcon, Users, IndianRupee, ChevronDown, User, Check, Search, Download, Calendar, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";

const GroupTransactions = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [group, setGroup] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Settlement Screen State
  const [showSettlement, setShowSettlement] = useState(false);

  // Add Transaction Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
    date: new Date().toISOString().split('T')[0]
  });

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.reason || !formData.date) return;

    setSubmitLoading(true);
    try {
      // Append current local time to the selected date
      const now = new Date();
      const [year, month, day] = formData.date.split('-');
      const localDate = new Date(Number(year), Number(month) - 1, Number(day), now.getHours(), now.getMinutes(), now.getSeconds());

      await api.post("/transactions", {
        group_id: id,
        type: "expense", // Group transaction
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        date: localDate.toISOString(),
        status: "completed"
      });

      toast.success("Group expense added successfully");
      setIsAddModalOpen(false);
      setFormData({ amount: "", reason: "", date: new Date().toISOString().split('T')[0] });
      fetchGroupData(); // Refresh list
    } catch (error) {
      console.error("Failed to add transaction", error);
      toast.error("Failed to add expense");
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchGroupData();
    }
  }, [id]);

  useEffect(() => {
    if (location.state?.expandedTxId) {
      setExpandedTxId(location.state.expandedTxId);
      // Clean up the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const toggleSettle = async (tx: any, memberId: string) => {
    try {
      let settledMembers: string[] = [];
      if (tx.note) {
        try {
          settledMembers = JSON.parse(tx.note);
          if (!Array.isArray(settledMembers)) settledMembers = [];
        } catch (e) {
          settledMembers = [];
        }
      }

      if (settledMembers.includes(memberId)) {
        settledMembers = settledMembers.filter((mid) => mid !== memberId);
      } else {
        settledMembers.push(memberId);
      }

      const newNote = JSON.stringify(settledMembers);

      // Optimistic UI update
      const originalTx = { ...tx };
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, note: newNote } : t)));

      try {
        await api.put(`/transactions/${tx.id}`, {
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          date: tx.date,
          note: newNote,
          category: tx.category,
          reason: tx.reason
        });
      } catch (err) {
        // Revert on error
        setTransactions((prev) => prev.map((t) => (t.id === tx.id ? originalTx : t)));
        toast.error("Failed to update settlement status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupRes, txRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/transactions/group/${id}`)
      ]);
      setGroup(groupRes.data);
      setTransactions(txRes.data);
    } catch (error) {
      console.error("Failed to fetch group data:", error);
      toast.error("Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  // Derived state for filtering
  // Universal participants list
  const participants = useMemo(() => {
    if (!group) return [];

    const list: any[] = [];
    const groupTime = new Date(group.createdAt || Date.now()).getTime();

    // Creator of the group
    list.push({
      id: 'creator',
      name: group.uid === user?.id ? "You" : (group.User?.name || group.user?.name || "Group Admin"),
      isMe: group.uid === user?.id,
      userId: group.uid,
      personId: 'creator',
      isAdmin: true,
      joinedAt: groupTime
    });

    // Members of the group
    (group.members || []).forEach((m: any) => {
      const getJoinedAt = (member: any, defaultTime: number) => {
        const gm = member.GroupMember;
        if (!gm) return defaultTime;
        const dateStr = gm.joinedAt || gm.joined_at || gm.createdAt || gm.created_at;
        if (!dateStr) return defaultTime;
        const time = new Date(dateStr).getTime();
        return isNaN(time) ? defaultTime : time;
      };
      
      list.push({
        id: m.id,
        name: m.linked_user_id === user?.id ? "You" : m.name,
        isMe: m.linked_user_id === user?.id,
        userId: m.linked_user_id,
        personId: m.id,
        joinedAt: getJoinedAt(m, groupTime)
      });
    });

    // Sort: "You" first, then others
    return list.sort((a, b) => (a.isMe === b.isMe ? 0 : a.isMe ? -1 : 1));
  }, [group, user?.id]);

  const getTxParticipants = (tx: any) => {
    // We add a 1 minute buffer to account for minor time discrepancies
    const txTime = new Date(tx.createdAt || tx.date).getTime() + 60000;
    return participants.filter(p => p.isAdmin || p.joinedAt <= txTime);
  };

  const filteredTransactions = useMemo(() => {
    const myParticipant = participants.find(p => p.isMe);

    return transactions.filter(tx => {
      // Time-based visibility filter for non-admin members
      if (myParticipant && !myParticipant.isAdmin && myParticipant.joinedAt) {
        const txTime = new Date(tx.createdAt || tx.date).getTime();
        if (txTime < myParticipant.joinedAt - 60000) {
          return false; // Hide transactions created before they joined
        }
      }

      // Month Filter
      const txDate = new Date(tx.date || tx.createdAt);
      if (txDate.getMonth() !== currentDate.getMonth() || txDate.getFullYear() !== currentDate.getFullYear()) {
        return false;
      }

      // Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesReason = (tx.reason || tx.category || '').toLowerCase().includes(q);
        const matchesAmount = tx.amount.toString().includes(q);
        return matchesReason || matchesAmount;
      }
      return true;
    });
  }, [transactions, currentDate, searchQuery, participants]);



  // Calculate Member Balances for the current month
  const memberBalances = useMemo(() => {
    if (!participants || participants.length === 0) return [];

    const others = participants.filter(p => !p.isMe);

    return others.map((other: any) => {
      let balance = 0; // Positive = You will get, Negative = You will give

      filteredTransactions.forEach(tx => {
        const txParticipants = getTxParticipants(tx);
        
        // If the other person wasn't in the group for this transaction, they have no share
        const otherInTx = txParticipants.some(p => p.id === other.id);
        if (!otherInTx) return;

        const membersCount = txParticipants.length;
        const share = Number(tx.amount) / membersCount;

        // In group transactions, the payer is always tx.uid
        const payerUserId = tx.uid;
        const iPaid = (payerUserId === user?.id);
        const theyPaid = (payerUserId === other.userId);

        if (iPaid) {
          // I paid. They owe me `share`
          const isSettled = tx.note && tx.note.includes(`"${other.personId}"`);
          if (!isSettled) {
            balance += share;
          }
        } else if (theyPaid) {
          // They paid. I owe them `share`
          const myParticipant = participants.find(p => p.isMe);
          const isSettled = tx.note && myParticipant && tx.note.includes(`"${myParticipant.personId}"`);
          if (!isSettled) {
            balance -= share;
          }
        }
      });

      return {
        ...other,
        balance
      };
    });
  }, [filteredTransactions, participants, user?.id]);

  const calculateTotalExpense = () => {
    return filteredTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const generatePDF = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to generate report.");
      return;
    }
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text(`Group Report: ${group?.name || 'Group'}`, 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text(`Month: ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 36);

    const totalExpense = calculateTotalExpense();
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(`Total Group Expense: Rs. ${totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 196, 30, { align: "right" });

    const tableColumn = ["Sr. No.", "Date", "Reason / Note", "Amount (Rs.)"];
    const tableRows: any[] = [];

    filteredTransactions.forEach((tx, index) => {
      const dateStr = new Date(tx.date || tx.createdAt).toLocaleDateString("en-IN");
      const txData = [
        index + 1,
        dateStr,
        tx.reason || tx.category || "-",
        Number(tx.amount).toLocaleString("en-IN") + "/-"
      ];
      tableRows.push(txData);
    });

    const totalRow = ["", "", "Total Expense", totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 }) + "/-"];
    tableRows.push(totalRow);
    const totalRowIndex = tableRows.length - 1;

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, halign: 'center' },
      columnStyles: { 3: { halign: 'right' } },
      headStyles: { fillColor: [79, 70, 229], halign: 'center' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didParseCell: function (data) {
        if (data.row.index === totalRowIndex) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 255];
          if (data.column.index === 2) {
            data.cell.styles.halign = 'right';
          }
        }
      }
    });

    const fileName = `Group_Report_${group?.name?.replace(/\s+/g, "_")}_${currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}.pdf`;
    doc.save(fileName);
  };

  const handleDeleteTx = async (txId: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${txId}`);
      toast.success("Transaction deleted successfully");
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete transaction");
    }
  };

  const handleTxClick = (tx: any) => {
    setExpandedTxId(expandedTxId === tx.id ? null : tx.id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-indigo-500 dark:text-indigo-400 space-y-4 bg-gray-50/50 dark:bg-[#0a0a1a]">
        <Loader2 size={32} className="animate-spin opacity-80" />
        <p className="text-sm font-black uppercase tracking-widest">Loading Details</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50/50 dark:bg-[#0a0a1a]">
        <p className="text-gray-500 font-bold">Group not found</p>
        <button onClick={() => navigate("/groups")} className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg">Go Back</button>
      </div>
    );
  }

  if (showSettlement) {
    return (
      <div className="max-w-4xl mx-auto w-full font-sans transition-colors duration-300 pb-24 min-h-[100dvh] bg-slate-50 dark:bg-[#0a0a1a]">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center gap-4 px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => setShowSettlement(false)}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95 text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Monthly Settlement</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-4">
          <div className="bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl p-4 border border-indigo-100/50 dark:border-indigo-500/10 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
              <Users className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Monthly Balances</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Based on transactions from {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          {memberBalances.map((member: any) => {
            const getAmount = Math.abs(member.balance);
            const isGet = member.balance > 0;
            const isGive = member.balance < 0;
            const isSettled = member.balance === 0;

            return (
              <div key={member.id} className="bg-white dark:bg-[#151624] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between hover:border-indigo-500/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500 dark:text-slate-400 text-lg">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{member.name}</h4>
                    {isGet && <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">You will get</span>}
                    {isGive && <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">You will give</span>}
                    {isSettled && <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Settled</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-black ${isGet ? 'text-emerald-600 dark:text-emerald-400' : isGive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400 dark:text-gray-600'}`}>
                    ₹{getAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full font-sans transition-colors duration-300 pb-4 min-h-[100dvh] flex flex-col bg-gray-50/50 dark:bg-[#0a0a1a]">
      {/* Header */}
      <div className="sticky top-0 z-30 flex flex-none items-center justify-between px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/groups")}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
          >
            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-tight line-clamp-1 max-w-[200px] sm:max-w-xs">
              {group.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <Users size={10} />
                {group.members?.length || 0} Members
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors border border-indigo-100 dark:border-indigo-500/20 active:scale-95"
          >
            <Search size={20} />
          </button>

          {/* Download Report */}
          <button
            onClick={generatePDF}
            className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors border border-indigo-100 dark:border-indigo-500/20 active:scale-95"
            title="Download Report"
          >
            <Download size={20} />
          </button>

          <button
            onClick={() => navigate('/add-transaction', {
              state: {
                groupId: group.id,
                groupName: group.name,
                mode: "group",
                preSelectedPersons: group.members
              }
            })}
            className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white transition-colors shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 active:scale-95"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar Dropdown */}
      {isSearchOpen && (
        <div className="px-4 py-3 bg-white dark:bg-[#0a0a1a] border-b border-indigo-100/50 dark:border-gray-800 animate-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-[#151624] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium text-gray-900 dark:text-white transition-all placeholder:transition-opacity focus:placeholder:opacity-0"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 px-4 sm:px-6 py-3">
        {/* Month Selector */}
        <div className="flex items-center justify-center mb-5 mt-0">
          <div className="flex items-center justify-between w-[100%] max-w-[320px] sm:max-w-xs bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-1.5 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1e1f30] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-2 justify-center min-w-0 px-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hidden sm:flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Calendar size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest truncate">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1e1f30] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Total Expense Card */}
        <div
          onClick={() => setShowSettlement(true)}
          className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 dark:from-indigo-900 dark:via-[#1e1b4b] dark:to-black rounded-3xl p-6 shadow-2xl shadow-indigo-500/20 dark:shadow-indigo-900/40 relative overflow-hidden mb-8 border border-indigo-400/20 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100/70 mb-1 block">
                Total Group Expense
              </span>
              <div className="text-4xl font-black text-white tracking-tight flex items-center gap-2">
                <span className="text-2xl text-indigo-200">₹</span>
                {calculateTotalExpense().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-all shadow-inner backdrop-blur-sm shrink-0">
              <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 px-1 flex items-center gap-2">
            <HistoryIcon size={16} />
            Group Transactions
          </h3>

          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const initial = (tx.reason || tx.category || 'G').charAt(0).toUpperCase();
                const iconBg = 'bg-indigo-50 dark:bg-indigo-500/10';
                const iconColor = 'text-indigo-600 dark:text-indigo-400';
                const isExpanded = expandedTxId === tx.id;
                const txParticipants = getTxParticipants(tx);
                const membersCount = txParticipants.length;
                const shareAmount = Number(tx.amount) / membersCount;

                return (
                  <div
                    key={tx.id}
                    className="bg-white dark:bg-[#151624] rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all overflow-hidden"
                  >
                    <div
                      onClick={() => handleTxClick(tx)}
                      className="flex items-center justify-between p-4 cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ${iconBg} ${iconColor} font-black text-xl`}>
                          {initial}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                            {tx.reason || tx.category || 'Group Expense'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 px-2 py-0.5 rounded-md">
                              <Clock size={10} />
                              {new Date(tx.date || tx.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pl-4">
                        <p className="text-base font-black text-gray-900 dark:text-white">
                          ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    </div>

                    {/* Dropdown Content */}
                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        <div className="px-3 pb-3 pt-1">
                          <div className="bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-3 px-1">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Split Details</span>
                              <div className="flex items-center gap-3">
                                {tx.uid === user?.id && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTx(tx.id); }}
                                    className="text-[10px] flex items-center gap-1 font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md transition-colors"
                                  >
                                    <Trash2 size={12} />
                                    Delete
                                  </button>
                                )}
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{membersCount} Members</span>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              {txParticipants.map((p: any) => {
                                const isPayer = tx.uid === p.userId;

                                return (
                                  <div key={p.id} className="flex items-center justify-between bg-white dark:bg-[#151624] p-2.5 rounded-xl shadow-sm shadow-indigo-900/5 dark:shadow-none border border-transparent dark:border-gray-800/80">
                                    <div className="flex items-center gap-2.5">
                                      <div className="relative">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${p.isMe ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'}`}>
                                          <User size={12} strokeWidth={2.5} />
                                        </div>
                                        {p.isMe && (
                                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[6px] font-black uppercase tracking-wider px-1 rounded-sm border border-white dark:border-[#151624]">
                                            YOU
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{p.name || 'Unknown'}</span>
                                        {p.isAdmin && (
                                          <span className="text-[7px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">
                                            Group Admin
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs font-black text-gray-900 dark:text-white">
                                        ₹{shareAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      {isPayer && (
                                        <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 text-[8px] font-bold text-emerald-700 dark:text-emerald-400">
                                          Paid <Check size={8} strokeWidth={3} />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-[#151624] rounded-3xl border border-gray-100 dark:border-gray-800 border-dashed">
              <div className="w-16 h-16 bg-gray-50 dark:bg-[#1b1c2e] rounded-full flex items-center justify-center mb-4">
                <HistoryIcon size={24} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">No transactions yet</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Add an expense to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-[#0a0a1a] rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-700"></div>
            <div className="p-6">
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Add Group Expense</h3>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-gray-400 dark:text-gray-500 block mb-2 px-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-gray-400 dark:text-gray-500 block mb-2 px-1">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="What was this for?"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-widest uppercase text-gray-400 dark:text-gray-500 block mb-2 px-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-1/3 h-14 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest rounded-2xl text-[10px] active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black uppercase tracking-widest rounded-2xl text-xs disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20"
                  >
                    {submitLoading ? <Loader2 size={18} className="animate-spin" /> : "Save Expense"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTransactions;
