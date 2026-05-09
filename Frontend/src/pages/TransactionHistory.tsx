import React, { useState, useEffect, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

interface Transaction {
  id: string;
  type: "credit" | "debit" | "income" | "expense";
  amount: number;
  reason?: string;
  note?: string;
  date: string;
  status: "pending" | "completed";
  createdAt: string;
  Person?: {
    id: string;
    name: string;
    phone?: string;
  };
}

const TransactionHistory: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit">("all");
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed">("pending");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get("/transactions");
        if (Array.isArray(res.data)) {
          setTransactions(res.data);
        } else {
          setTransactions([]);
          console.error("API did not return an array", res.data);
        }
      } catch (err) {
        console.error("Failed to fetch transactions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const handleStatusChange = async (txId: string, newStatus: "pending" | "completed") => {
    try {
      await api.put(`/transactions/${txId}`, { status: newStatus });
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: newStatus } : tx));
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Status filter
      if (tx.status !== statusFilter) return false;

      // Type filter
      if (filterType !== "all" && tx.type !== filterType) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesReason = tx.reason?.toLowerCase().includes(q);
        const matchesNote = tx.note?.toLowerCase().includes(q);
        const matchesPerson = tx.Person?.name.toLowerCase().includes(q);
        return matchesReason || matchesNote || matchesPerson;
      }
      return true;
    });
  }, [transactions, filterType, searchQuery, statusFilter]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      const date = formatDate(tx.date || tx.createdAt);
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  // Calculate summary for display
  const summary = useMemo(() => {
    let credit = 0;
    let debit = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === "credit") credit += Number(tx.amount);
      if (tx.type === "debit") debit += Number(tx.amount);
    });
    return { credit, debit };
  }, [filteredTransactions]);

  return (
    <div className="max-w-4xl mx-auto w-full font-sans pb-24 animate-in slide-in-from-bottom-6 duration-300">
      {/* Header */}
      <div className="sticky top-0 z-30 px-6 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
        <div className="flex items-center justify-start gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-2xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-colors border border-gray-100 dark:border-gray-800"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-base font-black text-gray-900 dark:text-white tracking-widest">
            Transaction History
          </h2>
        </div>

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
              : "text-gray-400 hover:text-gray-600 dark:text-gray-400"
              }`}
          >
            Completed
            {statusFilter === "completed" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full animate-in fade-in slide-in-from-bottom-1" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-[#151624] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFilterType("all")}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${filterType === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-gray-50 dark:bg-[#151624] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1b1c2e]"
              }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("credit")}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-colors ${filterType === "credit"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
              : "bg-gray-50 dark:bg-[#151624] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1b1c2e]"
              }`}
          >
            <TrendingUp size={14} /> Credit
          </button>
          <button
            onClick={() => setFilterType("debit")}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-colors ${filterType === "debit"
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
              : "bg-gray-50 dark:bg-[#151624] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1b1c2e]"
              }`}
          >
            <TrendingDown size={14} /> Debit
          </button>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-6">
        {/* Quick Summary */}
        <div className="bg-white dark:bg-[#151624] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Found</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">{filteredTransactions.length}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Total Credit</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                ₹{summary.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-800"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Total Debit</span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                ₹{summary.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-20 bg-white/50 dark:bg-[#151624]/50 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No transactions found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedTransactions).map((date) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    {date}
                  </h3>
                  <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                </div>

                <div className="space-y-3">
                  {groupedTransactions[date].map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => {
                        console.log("Opening Log Drawer for:", tx.id);
                        setSelectedTx(tx);
                      }}
                      className="bg-white dark:bg-[#151624] p-4 rounded-[1.2rem] border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tx.type === "credit"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                            }`}
                        >
                          {tx.type === "credit" ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                            {tx.Person ? tx.Person.name : "Unknown"}
                          </h4>
                          {tx.reason && (
                            <p className="text-[11px] font-semibold text-indigo-600/80 dark:text-indigo-400/80 truncate max-w-[150px]">
                              {tx.reason}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            <Clock size={10} />
                            <span>{formatTime(tx.date || tx.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-base font-black whitespace-nowrap ${tx.type === "credit"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                            }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN")}
                        </span>
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-400 transition-colors">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
            {/* Drawer Handle */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8"></div>

            <div className="flex flex-col items-center mb-8">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 ${selectedTx.type === "credit" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10"}`}>
                {selectedTx.type === "credit" ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Transaction Details</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {selectedTx.id.slice(0, 8)}</p>
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Person</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedTx.Person?.name || "Unknown"}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</span>
                <span className={`text-lg font-black ${selectedTx.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  ₹{Number(selectedTx.amount).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(selectedTx.date || selectedTx.createdAt)}</p>
                  <p className="text-[10px] font-bold text-gray-400">{formatTime(selectedTx.date || selectedTx.createdAt)}</p>
                </div>
              </div>
              {selectedTx.reason && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</span>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedTx.reason}</p>
                </div>
              )}
            </div>

            <div className="flex">
              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
