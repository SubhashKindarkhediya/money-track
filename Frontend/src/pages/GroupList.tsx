import React, { useState, useEffect } from "react";
import { Users, Search, PlusCircle, ArrowLeft, Loader2, Calendar, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const GroupList = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get("/groups");
      setGroups(res.data);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto w-full font-sans transition-colors duration-300 pb-8 h-screen flex flex-col">
      {/* Header matching Person.tsx List View */}
      <div className="sticky top-0 z-30 flex flex-none items-center justify-between px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
          >
            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Group List
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
            onClick={() => navigate("/create-group")}
            className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white transition-colors shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 mt-6 flex-1 overflow-y-auto">
        {/* Animated Search Bar */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSearch ? 'max-h-20 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-[#151624] border border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-2xl outline-none focus:ring-2 text-sm font-bold text-gray-900 dark:text-white transition-all shadow-sm placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-500 dark:text-indigo-400 space-y-4">
            <Loader2 size={32} className="animate-spin opacity-80" />
            <p className="text-sm font-black uppercase tracking-widest">Loading Groups</p>
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="group relative bg-white dark:bg-[#151624] rounded-[1.5rem] p-4 sm:p-5 border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:border-indigo-500/30 transition-all cursor-pointer overflow-hidden flex flex-col h-full"
              >
                {/* Top Section */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[14px] bg-indigo-50 dark:bg-[#1b1c2e] flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform shrink-0">
                      <Users size={20} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-black text-black dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {group.name}
                      </h3>
                      {group.type && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                          <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            {group.type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-[#1b1c2e] transition-colors shrink-0"
                    onClick={(e) => {
                      e.stopPropagation(); // Stop clicking card
                      toast.success("Options coming soon!");
                    }}
                  >
                    <MoreVertical size={18} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Middle Section: Group Expense */}
                {(() => {
                  const txs = group.transactions || [];
                  const totalExpense = txs.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
                  return (
                    <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl px-3.5 py-3 mb-3 flex items-center justify-between border border-gray-100 dark:border-gray-800/50">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Expense</span>
                        <span className="text-base font-black text-gray-900 dark:text-white">₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-white dark:bg-[#151624] px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800 shadow-sm">
                        {txs.length === 0 ? "No Expenses" : `${txs.length} ${txs.length === 1 ? 'Transaction' : 'Transactions'}`}
                      </div>
                    </div>
                  );
                })()}

                {/* Bottom Section */}
                <div className="pt-3 mt-auto border-t border-gray-50 dark:border-gray-800/50 flex items-end justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex -space-x-2">
                      {group.members?.slice(0, 5).map((m: any, i: number) => (
                        <div
                          key={m.id}
                          className="w-7 h-7 rounded-full border-2 border-white dark:border-[#151624] bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 relative z-[3] hover:z-[5] hover:scale-110 transition-transform cursor-pointer"
                          title={m.name}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {group.members && group.members.length > 5 && (
                        <div className="w-7 h-7 rounded-full border-2 border-white dark:border-[#151624] bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[9px] font-black text-gray-500 dark:text-gray-400 relative z-[2]">
                          +{group.members.length - 5}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 ml-1">
                      <Users size={10} />
                      {group.members?.length || 0} members
                    </p>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-24 h-24 bg-gray-50 dark:bg-[#151624] rounded-full flex items-center justify-center mb-6">
              <Users size={48} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No groups yet</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-sm mb-8">
              {searchQuery ? "No groups match your search." : "You haven't created any groups yet. Groups make it easy to split bills."}
            </p>
            <button
              onClick={() => navigate("/create-group")}
              className="flex items-center gap-2 px-6 py-3.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95"
            >
              <PlusCircle size={20} />
              <span className="uppercase tracking-widest text-xs">Create Group</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupList;
