import React, { useState, useEffect } from "react";
import { ArrowLeft, PlusCircle, Loader2, Clock, History as HistoryIcon, Users, IndianRupee } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const GroupTransactions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const calculateTotalExpense = () => {
    return transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  };

  const handleTxClick = (tx: any) => {
    // Navigate to transaction details or edit (optional feature for future)
    toast.success("Transaction detail coming soon!");
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

  return (
    <div className="max-w-4xl mx-auto w-full font-sans transition-colors duration-300 pb-24 h-screen flex flex-col bg-gray-50/50 dark:bg-[#0a0a1a]">
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

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white transition-colors shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 active:scale-95"
        >
          <PlusCircle size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {/* Total Expense Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 dark:from-indigo-900 dark:via-[#1e1b4b] dark:to-black rounded-3xl p-6 shadow-2xl shadow-indigo-500/20 dark:shadow-indigo-900/40 relative overflow-hidden mb-8 border border-indigo-400/20">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>

          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100/70 mb-1 block">
              Total Group Expense
            </span>
            <div className="text-4xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="text-2xl text-indigo-200">₹</span>
              {calculateTotalExpense().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 px-1 flex items-center gap-2">
            <HistoryIcon size={16} />
            Group Transactions
          </h3>

          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const initial = (tx.reason || tx.category || 'G').charAt(0).toUpperCase();
                const iconBg = 'bg-indigo-50 dark:bg-indigo-500/10';
                const iconColor = 'text-indigo-600 dark:text-indigo-400';

                return (
                  <div
                    key={tx.id}
                    onClick={() => handleTxClick(tx)}
                    className="flex items-center justify-between p-4 bg-white dark:bg-[#151624] rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all cursor-pointer active:scale-[0.98]"
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

                    <div className="text-right pl-4">
                      <p className="text-base font-black text-gray-900 dark:text-white">
                        ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
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
