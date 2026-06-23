import React, { useState, useEffect } from "react";
import { ArrowLeft, Users, Search, Loader2, X, PlusCircle, Tag, ChevronDown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

const CreateGroup = () => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("Friends");
  const [customType, setCustomType] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [persons, setPersons] = useState<any[]>([]);
  const [filteredPersons, setFilteredPersons] = useState<any[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const groupTypeOptions = ["Friends", "Trip", "Home", "Couple", "Office", "Other"];

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && typeof target.closest === "function" && !target.closest(".custom-dropdown-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      setLoading(true);
      const res = await api.get("/person");
      setPersons(res.data);
      setFilteredPersons(res.data);
    } catch (error) {
      console.error("Failed to fetch persons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPersons(persons.filter(p => !selectedPersons.find(sp => sp.id === p.id)));
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredPersons(
        persons.filter(p => 
          !selectedPersons.find(sp => sp.id === p.id) &&
          (p.name.toLowerCase().includes(lowerQuery) || (p.phone && p.phone.includes(lowerQuery)))
        )
      );
    }
  }, [searchQuery, persons, selectedPersons]);

  const handleAddPerson = (person: any) => {
    setSelectedPersons([...selectedPersons, person]);
    setSearchQuery("");
  };

  const handleRemovePerson = (personId: string) => {
    setSelectedPersons(selectedPersons.filter(p => p.id !== personId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedPersons.length === 0) {
      toast.error("Please add at least one person to the group");
      return;
    }

    try {
      setIsSubmitting(true);
      const finalType = groupType === "Other" ? customType.trim() : groupType;
      
      await api.post("/groups", {
        name: groupName,
        type: finalType || "Other",
        member_ids: selectedPersons.map(p => p.id)
      });
      toast.success("Group created successfully!");
      navigate("/groups"); // Go to Group List
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-white dark:bg-[#0a0a1a]">
      <div className="max-w-4xl mx-auto w-full font-sans animate-in slide-in-from-bottom-6 duration-300 min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 flex items-center gap-4 px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
          >
            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h2 className="text-base font-black text-gray-900 dark:text-white tracking-wide flex-1">
            Create New Group
          </h2>
        </div>

        <div className="p-4 sm:p-6 pb-32 space-y-6">
          {/* Group Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Group Name</label>
              <div className="relative">
                <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Goa Trip, Roommates"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-white dark:bg-[#151624] border border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-2xl outline-none focus:ring-2 text-base font-bold text-gray-900 dark:text-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Group Type</label>
              <div className={`relative custom-dropdown-container ${activeDropdown === "groupType" ? "z-30" : "z-10"}`}>
                <Tag size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors ${activeDropdown === "groupType" ? "text-indigo-500" : "text-gray-400"}`} />
                <div
                  onClick={() => setActiveDropdown(activeDropdown === "groupType" ? null : "groupType")}
                  className={`w-full pl-11 pr-4 py-4 bg-white dark:bg-[#151624] border ${
                    activeDropdown === "groupType" 
                      ? "border-indigo-500 ring-2 ring-indigo-500/10" 
                      : "border-gray-200 dark:border-gray-800"
                  } rounded-2xl flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-all shadow-sm group`}
                >
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {groupType}
                  </span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${activeDropdown === "groupType" ? "rotate-180 text-indigo-500" : ""}`} />
                </div>

                {activeDropdown === "groupType" && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-indigo-900/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      {groupTypeOptions.map((opt) => (
                        <div
                          key={opt}
                          onClick={() => {
                            setGroupType(opt);
                            setActiveDropdown(null);
                          }}
                          className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between ${
                            groupType === opt
                              ? 'bg-indigo-50 dark:bg-[#1b1c2e] text-indigo-700 dark:text-indigo-400 font-bold'
                              : 'hover:bg-gray-50 dark:hover:bg-[#1b1c2e] text-gray-700 dark:text-gray-300 font-medium'
                          }`}
                        >
                          {opt}
                          {groupType === opt && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {groupType === "Other" && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    type="text"
                    placeholder="Enter custom type (e.g. Project, Party)"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#151624] border border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-xl outline-none focus:ring-2 text-sm font-bold text-gray-900 dark:text-white transition-all shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800 my-2"></div>

          {/* Person Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Add Members</label>
            
            {/* Selected Persons Pills */}
            {selectedPersons.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedPersons.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
                    <div className="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-700 dark:text-indigo-400">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">{p.name}</span>
                    <button onClick={() => handleRemovePerson(p.id)} className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 rounded-full transition-colors text-indigo-500 dark:text-indigo-400 ml-1">
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search persons to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#1e1f30] border border-gray-200 dark:border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/10 rounded-xl outline-none focus:ring-2 text-sm font-bold text-gray-900 dark:text-white transition-all shadow-sm"
              />
            </div>

            {/* Results List */}
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-xs text-center text-gray-400 py-4 font-bold flex items-center justify-center gap-2 animate-pulse">
                  <Loader2 size={14} className="animate-spin" /> Loading persons...
                </p>
              ) : filteredPersons.length > 0 ? (
                filteredPersons.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAddPerson(p)}
                    className="flex items-center justify-between p-3 bg-white dark:bg-[#151624] border border-gray-100 dark:border-gray-800 rounded-xl cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg border border-indigo-200/50 dark:border-indigo-500/30">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.name}</p>
                        {p.phone && <p className="text-xs font-medium text-gray-500">{p.phone}</p>}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <PlusCircle size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center text-gray-400 py-4 font-bold bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  {searchQuery ? "No matching persons found" : "All persons added to group"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Bottom Button */}
        <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-xl border-t border-indigo-100/50 dark:border-gray-800 z-50 mt-auto">
          <button
            onClick={handleCreateGroup}
            disabled={isSubmitting}
            className="w-full h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black rounded-2xl shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] tracking-wide disabled:opacity-70 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Users size={18} strokeWidth={2.5} />
                <span className="uppercase tracking-[0.1em] text-sm font-bold">
                  Create Group
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
