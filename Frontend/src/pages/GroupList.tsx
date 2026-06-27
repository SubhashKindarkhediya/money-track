import React, { useState, useEffect } from "react";
import { Users, Search, PlusCircle, ArrowLeft, Loader2, Calendar, MoreVertical, Eye, Edit, Trash2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";

const GroupList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<any | null>(null);
  const [leaveGroupConfirm, setLeaveGroupConfirm] = useState<any | null>(null);

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

  const sortedGroups = [...groups].sort((a, b) => {
    const aLatestTx = a.transactions?.length > 0
      ? new Date(Math.max(...a.transactions.map((t: any) => new Date(t.date || t.createdAt).getTime())))
      : new Date(a.createdAt);
    const bLatestTx = b.transactions?.length > 0
      ? new Date(Math.max(...b.transactions.map((t: any) => new Date(t.date || t.createdAt).getTime())))
      : new Date(b.createdAt);
    return bLatestTx.getTime() - aLatestTx.getTime();
  });

  const filteredGroups = sortedGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteGroupClick = (group: any) => {
    const txs = group.transactions || [];
    const totalExpense = txs.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);

    if (totalExpense > 0) {
      toast.error("Cannot delete group. Total expense is not 0.");
      return;
    }

    setDeleteGroupConfirm(group);
  };

  const confirmDeleteGroup = async () => {
    if (!deleteGroupConfirm) return;
    try {
      await api.delete(`/groups/${deleteGroupConfirm.id}`);
      toast.success("Group deleted successfully");
      fetchGroups();
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast.error("Failed to delete group");
    } finally {
      setDeleteGroupConfirm(null);
    }
  };

  const handleLeaveGroupClick = (group: any) => {
    let balance = 0;
    if (group.transactions && group.transactions.length > 0) {
      const myMember = group.members?.find((m: any) => m.linked_user_id === user?.id);
      if (myMember) {
        const personId = myMember.id;
        const groupTime = new Date(group.createdAt || Date.now()).getTime();

        const getJoinedAt = (member: any, defaultTime: number) => {
          const gm = member?.GroupMember;
          if (!gm) return defaultTime;
          const dateStr = gm.joinedAt || gm.joined_at || gm.createdAt || gm.created_at;
          if (!dateStr) return defaultTime;
          const time = new Date(dateStr).getTime();
          return isNaN(time) ? defaultTime : time;
        };
        const myJoinedAt = getJoinedAt(myMember, groupTime);

        group.transactions.forEach((tx: any) => {
          const txTime = new Date(tx.createdAt || tx.date).getTime() + 60000;
          if (myJoinedAt > txTime) return;

          const membersCount = (group.members?.length || 0) + 1;
          const share = Number(tx.amount) / membersCount;

          const iPaid = (tx.uid === user?.id);
          const creatorPaid = (tx.uid === group.uid && !tx.person_id);

          if (creatorPaid) {
            const isSettled = tx.note && tx.note.includes(`"${personId}"`);
            if (!isSettled) balance -= share;
          } else if (iPaid) {
            const isSettled = tx.note && tx.note.includes(`"creator"`);
            if (!isSettled) balance += share;
          }
        });
      }
    }

    if (Math.abs(balance) > 0.01) {
      toast.error("Cannot leave group. You have unsettled balances.");
      return;
    }

    setLeaveGroupConfirm(group);
  };

  const confirmLeaveGroup = async () => {
    if (!leaveGroupConfirm) return;
    try {
      await api.post(`/groups/${leaveGroupConfirm.id}/leave`);
      toast.success("Left group successfully");
      fetchGroups();
    } catch (error) {
      console.error("Failed to leave group:", error);
      toast.error("Failed to leave group");
    } finally {
      setLeaveGroupConfirm(null);
    }
  };

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
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[14px] bg-indigo-50 dark:bg-[#1b1c2e] flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform shrink-0">
                      <Users size={20} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-black text-black dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {group.name}
                      </h3>

                    </div>
                  </div>

                  <div className="relative shrink-0 -mt-1 -mr-1">
                    <button
                      className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-[#1b1c2e] transition-colors active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === group.id ? null : group.id);
                      }}
                    >
                      <MoreVertical size={20} strokeWidth={2.5} />
                    </button>
                    {group.type && (
                      <div className="absolute right-3 top-11 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full shadow-sm bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 whitespace-nowrap">
                        <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                        <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none pt-[1px]">
                          {group.type}
                        </span>
                      </div>
                    )}
                  </div>
                </div>



                {/* Bottom Section */}
                <div className="pt-3 mt-auto border-t border-gray-50 dark:border-gray-800/50 flex items-end justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex -space-x-2">
                      {group.members?.slice(0, 5).map((m: any, i: number) => (
                        <div
                          key={m.id}
                          className="w-7 h-7 rounded-full border-2 border-white dark:border-[#151624] bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-[10px] font-black text-gray-600 dark:text-gray-300 relative z-[3] hover:z-[5] hover:scale-110 transition-transform cursor-pointer"
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

      {/* Bottom Drawer Options */}
      {activeDropdown && (() => {
        const group = groups.find(g => g.id === activeDropdown);
        if (!group) return null;
        return (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setActiveDropdown(null)}
            ></div>

            {/* Drawer Content */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#151624] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
              <div className="flex justify-center pt-3 pb-2 sm:hidden">
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
              </div>

              <div className="p-4 sm:p-6 space-y-2 pb-8 sm:pb-6">
                <div className="mb-4 px-2 text-center sm:text-left">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white truncate">{group.name}</h3>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Group Options</p>
                </div>

                <div
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer transition-all active:scale-[0.98] group/opt"
                  onClick={(e) => { e.stopPropagation(); navigate(`/groups/${group.id}`); setActiveDropdown(null); }}
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover/opt:bg-indigo-100 dark:group-hover/opt:bg-indigo-500/20 transition-colors">
                    <Eye size={22} strokeWidth={2.5} />
                  </div>
                  <span className="text-base font-bold text-gray-900 dark:text-white group-hover/opt:text-indigo-600 dark:group-hover/opt:text-indigo-400 transition-colors">View Details</span>
                </div>

                <div
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer transition-all active:scale-[0.98] group/opt"
                  onClick={(e) => { e.stopPropagation(); navigate("/create-group", { state: { editGroup: group } }); setActiveDropdown(null); }}
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover/opt:bg-indigo-100 dark:group-hover/opt:bg-indigo-500/20 transition-colors">
                    <Edit size={22} strokeWidth={2.5} />
                  </div>
                  <span className="text-base font-bold text-gray-900 dark:text-white group-hover/opt:text-indigo-600 dark:group-hover/opt:text-indigo-400 transition-colors">Edit Group</span>
                </div>

                {group.uid === user?.id ? (
                  <div
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-all active:scale-[0.98] group/opt"
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroupClick(group); setActiveDropdown(null); }}
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 dark:text-rose-400 group-hover/opt:bg-rose-100 dark:group-hover/opt:bg-rose-500/20 transition-colors">
                      <Trash2 size={22} strokeWidth={2.5} />
                    </div>
                    <span className="text-base font-bold text-rose-600 dark:text-rose-400">Delete Group</span>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-all active:scale-[0.98] group/opt"
                    onClick={(e) => { e.stopPropagation(); handleLeaveGroupClick(group); setActiveDropdown(null); }}
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 dark:text-rose-400 group-hover/opt:bg-rose-100 dark:group-hover/opt:bg-rose-500/20 transition-colors">
                      <LogOut size={22} strokeWidth={2.5} />
                    </div>
                    <span className="text-base font-bold text-rose-600 dark:text-rose-400">Leave Group</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Drawer */}
      {deleteGroupConfirm && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setDeleteGroupConfirm(null)}
          ></div>

          {/* Drawer Content */}
          <div className="relative w-full max-w-md bg-white dark:bg-[#151624] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            <div className="flex justify-center pt-3 pb-2 sm:hidden">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
            </div>

            <div className="p-6 space-y-6 pb-8 sm:pb-6 text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} strokeWidth={2} />
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Delete Group?</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete <span className="text-gray-900 dark:text-white font-bold">"{deleteGroupConfirm.name}"</span>? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteGroupConfirm(null)}
                  className="flex-1 px-4 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteGroup}
                  className="flex-1 px-4 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-colors active:scale-95 shadow-lg shadow-rose-500/25"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Drawer */}
      {leaveGroupConfirm && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setLeaveGroupConfirm(null)}
          ></div>

          {/* Drawer Content */}
          <div className="relative w-full max-w-md bg-white dark:bg-[#151624] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            <div className="flex justify-center pt-3 pb-2 sm:hidden">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
            </div>

            <div className="p-6 space-y-6 pb-8 sm:pb-6 text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <LogOut size={32} strokeWidth={2} />
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Leave Group?</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Are you sure you want to leave <span className="text-gray-900 dark:text-white font-bold">"{leaveGroupConfirm.name}"</span>? Please make sure all your dues are settled before leaving.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setLeaveGroupConfirm(null)}
                  className="flex-1 px-4 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeaveGroup}
                  className="flex-1 px-4 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-colors active:scale-95 shadow-lg shadow-rose-500/25"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupList;
