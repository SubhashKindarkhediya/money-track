import React, { useState, useEffect, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Clock, ChevronRight, ArrowLeft, Download, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import MarqueeText from "../components/MarqueeText";

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

const PersonalHistory: React.FC = () => {
  const { currencySymbol, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
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
      // Only Income and Expense
      if (tx.type !== "income" && tx.type !== "expense") return false;

      // Type filter
      if (filterType !== "all" && tx.type !== filterType) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesReason = tx.reason?.toLowerCase().includes(q);
        const matchesNote = tx.note?.toLowerCase().includes(q);
        return matchesReason || matchesNote;
      }
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  // Group by date — each group sorted latest-first inside
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach((tx) => {
      const date = formatDate(tx.date || tx.createdAt);
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    // Sort transactions within each group: latest createdAt first
    Object.keys(groups).forEach((date) => {
      groups[date].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    return groups;
  }, [filteredTransactions]);

  // Date keys sorted newest-first
  const sortedDates = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => {
      // Parse "30 May 2026" style dates for comparison
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [groupedTransactions]);

  // Calculate summary for display
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === "income") income += Number(tx.amount);
      if (tx.type === "expense") expense += Number(tx.amount);
    });
    return { income, expense };
  }, [filteredTransactions]);

  const generatePDF = () => {
    if (filteredTransactions.length === 0) {
      alert("No transactions found to generate report.");
      return;
    }
    const doc = new jsPDF();

    // Detect if all transactions belong to the same single person
    const uniquePersonNames = [...new Set(filteredTransactions.map(tx => tx.Person?.name || "Unknown"))];
    const isSinglePerson = uniquePersonNames.length === 1;
    const singlePersonName = isSinglePerson ? uniquePersonNames[0] : null;

    // Header title
    doc.setFontSize(20);
    doc.setTextColor(40);
    const reportTitle = `Personal Transactions Report`;
    doc.text(reportTitle, 14, 22);

    const showIncome = filterType === "all" || filterType === "income";
    const showExpense = filterType === "all" || filterType === "expense";
    let netLabelStr = "";

    if (showIncome && showExpense) {
      const netBalance = summary.income - summary.expense;
      const prefix = netBalance >= 0 ? "Net Savings" : "Net Deficit";
      netLabelStr = `${prefix}: ${Math.abs(netBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}/-`;
    }

    if (netLabelStr) {
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text("Net Flow", 196, 30, { align: "right" });
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39); // gray-900 (darker)
      doc.text(netLabelStr, 196, 36, { align: "right" });
    }

    let tableStartY = 38;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 30);

    // Build table columns
    const tableColumn = ["Sr. No.", "Date", "Reason / Note"];
    if (showIncome) tableColumn.push("Income (Rs.)");
    if (showExpense) tableColumn.push("Expense (Rs.)");

    const tableRows: any[] = [];

    filteredTransactions.forEach((tx, index) => {
      const txData: any[] = [
        index + 1,
        formatDate(tx.date || tx.createdAt),
        tx.reason || tx.note || "-"
      ];
      if (showIncome) {
        txData.push(tx.type === "income" ? Number(tx.amount).toLocaleString("en-IN") + "/-" : "-");
      }
      if (showExpense) {
        txData.push(tx.type === "expense" ? Number(tx.amount).toLocaleString("en-IN") + "/-" : "-");
      }
      tableRows.push(txData);
    });

    // Total row
    let totalLabel = "Total";
    if (filterType === "income") totalLabel = "Total Income";
    else if (filterType === "expense") totalLabel = "Total Expense";

    const leadingCells = ["", "", totalLabel];
    const totalRow: any[] = [...leadingCells];
    if (showIncome) totalRow.push(summary.income.toLocaleString("en-IN", { minimumFractionDigits: 2 }) + "/-");
    if (showExpense) totalRow.push(summary.expense.toLocaleString("en-IN", { minimumFractionDigits: 2 }) + "/-");
    tableRows.push(totalRow);



    // Dynamic column styles for right-aligning amount columns
    const reasonColIndex = 2;   // index of "Reason / Note"
    const amountStartIndex = reasonColIndex + 1;       // first amount column
    const colStyles: any = { 0: { cellWidth: 15 } };
    if (showIncome && showExpense) {
      colStyles[amountStartIndex] = { halign: 'right' };
      colStyles[amountStartIndex + 1] = { halign: 'right' };
    } else if (showIncome || showExpense) {
      colStyles[amountStartIndex] = { halign: 'right' };
    }

    // Determine which rows are special (Total row)
    const totalRowIndex = tableRows.length - 1;

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: tableStartY,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, halign: 'center' },
      columnStyles: colStyles,
      headStyles: { fillColor: [79, 70, 229], halign: 'center' }, // indigo-600
      alternateRowStyles: { fillColor: [249, 250, 251] }, // gray-50
      didParseCell: function (data) {
        // Highlight the Total row
        if (data.row.index === totalRowIndex) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 255]; // slight indigo tint

          // Right-align the "Total" label cell
          if (data.column.index === reasonColIndex) {
            data.cell.styles.halign = 'right';
          }
        }
      }
    });

    const fileName = "Personal_Transactions_Report.pdf";
    doc.save(fileName);
  };


  return (
    <div className="max-w-4xl mx-auto w-full font-sans pb-24 animate-in slide-in-from-bottom-6 duration-300">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm shadow-indigo-900/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center justify-start gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-all border border-gray-100 dark:border-gray-800 active:scale-95"
            >
              <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-widest">
              Personal History
            </h2>
          </div>

          <button
            onClick={generatePDF}
            className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-2 shadow-sm"
            title="Download PDF Report"
          >
            <Download size={18} />
            <span className="text-sm font-bold hidden sm:block pr-1">Report</span>
          </button>
        </div>



        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by category, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-[#151624] border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium text-gray-900 dark:text-white transition-all shadow-sm placeholder:transition-opacity focus:placeholder:opacity-0"
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
            onClick={() => setFilterType("income")}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-colors ${filterType === "income"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
              : "bg-gray-50 dark:bg-[#151624] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1b1c2e]"
              }`}
          >
            <TrendingUp size={14} /> Income
          </button>
          <button
            onClick={() => setFilterType("expense")}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-colors ${filterType === "expense"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-gray-50 dark:bg-[#151624] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1b1c2e]"
              }`}
          >
            <TrendingDown size={14} /> Expense
          </button>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-6">
        {/* Unified Quick Summary Card */}
        <div className="bg-white dark:bg-[#151624] rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          
          {/* Top Section: Net Flow */}
          {filterType === "all" && (
            <div className="px-4 sm:px-5 py-3 border-b border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#1b1c2e]/30 flex justify-end">
              <span className="text-[13px] sm:text-sm font-black text-gray-900 dark:text-white">
                {summary.income - summary.expense >= 0 ? "Net Savings: " : "Net Deficit: "}
                <span className={summary.income - summary.expense >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {currencySymbol}{Math.abs(summary.income - summary.expense).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          )}

          {/* Bottom Section: Stats */}
          <div className="p-4 sm:p-5 flex items-center justify-between gap-4 overflow-x-auto hide-scrollbar">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Total Found</span>
              <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">{filteredTransactions.length}</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Total Income</span>
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}{summary.income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 shrink-0"></div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Total Expense</span>
                <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                  {currencySymbol}{summary.expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
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
            {sortedDates.map((date) => (
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
                      <div className="flex items-center gap-4 min-w-0 flex-1 mr-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tx.type === "income"
                            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                            }`}
                        >
                          {tx.type === "income" ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <MarqueeText
                            text={tx.reason || tx.note || "Personal"}
                            className="text-sm font-bold text-gray-900 dark:text-white"
                          />
                          <div className="flex items-center gap-2 mt-0.5">
                            {tx.note?.includes("Old Transaction Auto-Added") && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-500/20 whitespace-nowrap">Old</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            <Clock size={10} />
                            <span>{formatTime(tx.date || tx.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <MarqueeText
                          text={`${tx.type === "income" ? "+ " : "- "}${currencySymbol}${Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          className={`text-base font-black ${tx.type === "income" ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"}`}
                          containerClassName="justify-end min-w-[70px]"
                        />
                        <div
                          className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                        >
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
            className="bg-white dark:bg-[#0a0a1a] rounded-t-[2.5rem] p-5 sm:p-6 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300 sm:max-w-md sm:mx-auto sm:w-full sm:rounded-[2.5rem] sm:mb-8 border-t border-indigo-100/50 dark:border-gray-800 translate-y-0 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button X */}
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute right-6 top-6 p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-rose-500 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Drawer Handle */}
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-6"></div>

            <div className="flex flex-col items-center mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${selectedTx.type === "income" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10"}`}>
                {selectedTx.type === "income" ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Transaction Details</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {selectedTx.id.slice(0, 8)}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</span>
                <span className={`text-base font-black ${selectedTx.type === "income" ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {currencySymbol}{Number(selectedTx.amount).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date & Time</span>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{formatDate(selectedTx.date || selectedTx.createdAt)}</p>
                  <p className="text-[9px] font-bold text-gray-400">{formatTime(selectedTx.date || selectedTx.createdAt)}</p>
                </div>
              </div>
              {selectedTx.reason && (
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Description</span>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{selectedTx.reason}</p>
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20 transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PersonalHistory;
