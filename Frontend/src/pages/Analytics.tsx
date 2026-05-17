import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LabelList
} from "recharts";
import {
  ArrowLeft, Calendar, TrendingUp, TrendingDown,
  PieChart as PieChartIcon, BarChart3, ChevronLeft, ChevronRight,
  Filter, Activity, ChevronUp, Layers, IndianRupee, ChevronDown, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import MarqueeText from "../components/MarqueeText";

const Analytics: React.FC = () => {
  const { currencySymbol } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [chartSummaryData, setChartSummaryData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'credit'>('credit');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return "dd/mm/yy";
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const [reportRes, summaryRes] = await Promise.all([
        api.get(`/dashboard/report?month=${selectedMonth}&year=${selectedYear}`),
        api.get('/dashboard/summary')
      ]);
      setData(reportRes.data.data);
      setSummaryData(summaryRes.data.data);
      // Initialize chart summary data if no dates are selected
      if (!startDate && !endDate) {
        setChartSummaryData(summaryRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  // Fetch filtered summary for chart when date range changes
  useEffect(() => {
    const fetchFilteredSummary = async () => {
      try {
        let url = '/dashboard/summary';
        if (startDate && endDate) {
          url += `?startDate=${startDate}&endDate=${endDate}`;
        } else if (startDate) {
          url += `?startDate=${startDate}`;
        } else if (endDate) {
          url += `?endDate=${endDate}`;
        }
        const res = await api.get(url);
        setChartSummaryData(res.data.data);
      } catch (err) {
        console.error("Failed to fetch filtered summary", err);
      }
    };

    // Only fetch if initial data is loaded
    if (summaryData) {
      fetchFilteredSummary();
    }
  }, [startDate, endDate]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data?.transactions) return [];

    // Group by date for the area/bar chart
    const dailyData: Record<string, any> = {};
    data.transactions.forEach((tx: any) => {
      const day = new Date(tx.date || tx.createdAt).getDate();
      if (!dailyData[day]) {
        dailyData[day] = { day, income: 0, expense: 0, credit: 0, debit: 0 };
      }

      const amount = Number(tx.amount);
      if (tx.type === "income") dailyData[day].income += amount;
      if (tx.type === "expense") dailyData[day].expense += amount;
      if (tx.type === "credit") dailyData[day].credit += amount;
      if (tx.type === "debit") dailyData[day].debit += amount;
    });

    return Object.values(dailyData).sort((a, b) => a.day - b.day);
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.summary) return [];
    return [
      { name: "Income", value: data.summary.income, color: "#10b981" },
      { name: "Expense", value: data.summary.expense, color: "#f43f5e" },
      { name: "Credit", value: data.summary.credit, color: "#4f46e5" },
      { name: "Debit", value: data.summary.debit, color: "#f59e0b" },
    ].filter(item => item.value > 0);
  }, [data]);

  const colorMap: Record<string, any> = {
    "emerald": {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-100 dark:border-emerald-500/20",
      accent: "bg-emerald-500",
      iconBg: "bg-emerald-100 dark:bg-emerald-500/30",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    "rose": {
      bg: "bg-rose-50 dark:bg-rose-500/10",
      border: "border-rose-100 dark:border-rose-500/20",
      accent: "bg-rose-500",
      iconBg: "bg-rose-100 dark:bg-rose-500/30",
      iconColor: "text-rose-600 dark:text-rose-400"
    },
    "indigo": {
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      border: "border-indigo-100 dark:border-indigo-500/20",
      accent: "bg-indigo-500",
      iconBg: "bg-indigo-100 dark:bg-indigo-500/30",
      iconColor: "text-indigo-600 dark:text-indigo-400"
    },
    "amber": {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-100 dark:border-amber-500/20",
      accent: "bg-amber-500",
      iconBg: "bg-amber-100 dark:bg-amber-500/30",
      iconColor: "text-amber-600 dark:text-amber-400"
    }
  };

  const StatCard = ({ title, value, icon: Icon, theme, trend }: any) => {
    const c = colorMap[theme] || colorMap["indigo"];
    return (
      <div className={`relative overflow-hidden p-6 rounded-[2rem] border ${c.bg} ${c.border} flex flex-col items-start transition-all hover:scale-[1.02] shadow-sm`}>

        <div className="flex items-start justify-between w-full mb-4">
          {/* Icon Box */}
          <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${c.iconBg} ${c.iconColor}`}>
            <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center">
              <Icon size={16} strokeWidth={2.5} />
            </div>
          </div>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              {trend > 0 ? "+" : ""}{trend}%
            </span>
          )}
        </div>

        {/* Text Container */}
        <div className="flex flex-col min-w-0 w-full">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{title}</p>
          <div className="flex items-center gap-2 mt-1 min-w-0 w-full">
            <MarqueeText
              text={`${currencySymbol}${value.toLocaleString("en-IN")}`}
              className="text-2xl font-black text-gray-900 dark:text-white leading-none"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto w-full font-sans pb-24 animate-in slide-in-from-bottom-6 duration-300">
      {/* Header */}
      <div className="sticky top-0 z-30 px-6 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2.5 rounded-2xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-colors border border-gray-100 dark:border-gray-800"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-widest text-center">
              FINANCIAL INSIGHTS
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setActiveTab('credit')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'credit' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-100 dark:bg-[#1a1b2e] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#222338]'}`}
          >
            Credit & Debit
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'income' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-100 dark:bg-[#1a1b2e] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#222338]'}`}
          >
            Income & Expense
          </button>
        </div>

      </div>

      <div className="px-5 mt-8 space-y-8">
        {/* Month Selector */}
        {activeTab === 'income' && (
          <div className="flex items-center justify-between bg-white dark:bg-[#151624] p-3 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in duration-300">
            <button
              onClick={handlePrevMonth}
              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
            >
              <ChevronLeft size={20} className="text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-500">
                <Calendar size={18} />
              </div>
              <span className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {months[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
            >
              <ChevronRight size={20} className="text-gray-500" />
            </button>
          </div>
        )}

        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-4">
          {activeTab === 'income' ? (
            <>
              <StatCard
                title="Monthly Income"
                value={data?.summary?.income || 0}
                icon={TrendingUp}
                theme="emerald"
              />
              <StatCard
                title="Monthly Expense"
                value={data?.summary?.expense || 0}
                icon={TrendingDown}
                theme="rose"
              />
            </>
          ) : (
            <>
              <StatCard
                title="Pending Credit"
                value={summaryData?.udhar?.totalCredit || 0}
                icon={IndianRupee}
                theme="emerald"
              />
              <StatCard
                title="Pending Debit"
                value={summaryData?.udhar?.totalDebit || 0}
                icon={IndianRupee}
                theme="rose"
              />
            </>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-gray-400 animate-pulse">Analyzing your data...</p>
          </div>
        ) : activeTab === 'income' ? (
          chartData.length === 0 ? (
            <div className="text-center py-20 bg-white/50 dark:bg-[#151624]/50 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
              <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No data for this month</h3>
              <p className="text-gray-500 text-sm mt-1">Try switching to another month to see insights.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Trends Chart */}
              <div className="bg-white dark:bg-[#151624] p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" /> Daily Activity
                  </h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#888' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#888' }}
                        tickFormatter={(val) => `${currencySymbol}${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                      <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Expense</span>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-8">
            {/* Balance Card */}
            <div className="flex justify-center">
              {/* Daily Balance Card (Credit vs Debit) */}
              <div className="bg-white dark:bg-[#151624] p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between w-full max-w-2xl">
                <div className="mb-2">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Your pending balance</h3>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-1">Goal - Credit + Debit</p>
                </div>

                <div className="flex items-center justify-between flex-1 mt-4">
                  {/* Left Side: Stats */}
                  <div className="flex flex-col gap-6 z-10 min-w-0 flex-1 mr-4">
                    <div className="flex items-center gap-4 group min-w-0">
                      <div className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 p-2.5 rounded-[1rem] shadow-inner shadow-indigo-500/20 transition-all group-hover:scale-110 shrink-0">
                        <TrendingUp size={18} strokeWidth={3} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Credit</p>
                        <MarqueeText
                          text={`${currencySymbol}${(summaryData?.udhar?.totalCredit || 0).toLocaleString("en-IN")}`}
                          className="text-base font-black text-gray-900 dark:text-white leading-none mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 group min-w-0">
                      <div className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-[1rem] shadow-inner shadow-amber-500/20 transition-all group-hover:scale-110 shrink-0">
                        <TrendingDown size={18} strokeWidth={3} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Debit</p>
                        <MarqueeText
                          text={`${currencySymbol}${(summaryData?.udhar?.totalDebit || 0).toLocaleString("en-IN")}`}
                          className="text-base font-black text-gray-900 dark:text-white leading-none mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Doughnut */}
                  <div className="relative w-40 h-40 flex items-center justify-center z-10 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={
                            (summaryData?.udhar?.totalCredit || 0) === 0 && (summaryData?.udhar?.totalDebit || 0) === 0
                              ? [{ name: "Empty", value: 1, color: "rgba(99, 102, 241, 0.1)" }]
                              : [
                                { name: "Credit", value: summaryData?.udhar?.totalCredit || 0, color: "#4f46e5" },
                                { name: "Debit", value: summaryData?.udhar?.totalDebit || 0, color: "#f59e0b" }
                              ]
                          }
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={76}
                          stroke="none"
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          cornerRadius={20}
                          paddingAngle={3}
                        >
                          {((summaryData?.udhar?.totalCredit || 0) === 0 && (summaryData?.udhar?.totalDebit || 0) === 0
                            ? [{ name: "Empty", value: 1, color: "rgba(99, 102, 241, 0.1)" }]
                            : [
                              { name: "Credit", value: summaryData?.udhar?.totalCredit || 0, color: "#4f46e5" },
                              { name: "Debit", value: summaryData?.udhar?.totalDebit || 0, color: "#f59e0b" }
                            ]
                          ).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} className="dark:opacity-90" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center Text & Glow */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="absolute w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-amber-500/20 dark:from-indigo-500/30 dark:to-amber-500/30 blur-xl rounded-full"></div>
                      <MarqueeText
                        text={Math.abs((summaryData?.udhar?.totalCredit || 0) - (summaryData?.udhar?.totalDebit || 0)).toLocaleString("en-IN")}
                        className="text-xl font-black text-gray-900 dark:text-white relative z-10 tracking-tight"
                        containerClassName="max-w-[80px]"
                      />
                      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest relative z-10 mt-0.5">Net Bal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution Bar Chart */}
            <div className="bg-white dark:bg-[#151624] p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm mt-8">
              <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-2xl">
                    <Layers size={20} />
                  </div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">Distribution</h3>
                </div>
                <div className="relative z-20">
                  <button
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a1b2e] border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <Calendar size={16} className="text-indigo-500" />
                    {startDate && endDate
                      ? `${formatDateString(startDate)} - ${formatDateString(endDate)}`
                      : "Select Range"
                    }
                    <ChevronDown size={16} className={`text-gray-400 ml-1 transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`} />
                  </button>


                </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "CREDIT", value: chartSummaryData?.udhar?.totalCredit || 0, fill: "#4f46e5" },
                      { name: "DEBIT", value: chartSummaryData?.udhar?.totalDebit || 0, fill: "#f59e0b" }
                    ]}
                    margin={{ top: 30, right: 0, left: -20, bottom: 0 }}
                    barSize={60}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }}
                      tickFormatter={(value) => {
                        if (value >= 1000) return `${currencySymbol}${value / 1000}K`;
                        return `${currencySymbol}${value}`;
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                      formatter={(value: any) => [`${currencySymbol}${value.toLocaleString("en-IN")}`, "Amount"]}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(value: any) => value > 0 ? value.toLocaleString("en-IN") : ""}
                        style={{ fontSize: '10px', fontWeight: 'bold', fill: '#888' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Range Picker Bottom Drawer */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsDatePickerOpen(false)}
          ></div>
          <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-[#0a0a1a] rounded-t-[2rem] shadow-2xl border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-full duration-300">
            <div className="p-6 pb-8">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-6"></div>

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Select Date Range</h3>
                <button
                  onClick={() => setIsDatePickerOpen(false)}
                  className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Start Date</label>
                  <div className="relative group">
                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-base font-bold text-gray-900 dark:text-white w-full group-hover:border-indigo-500 transition-colors flex items-center justify-between">
                      <span>{startDate ? formatDateString(startDate) : "Select..."}</span>
                      <Calendar size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate || undefined}
                      onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          try { (e.target as any).showPicker(); } catch (err) { }
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">End Date</label>
                  <div className="relative group">
                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-base font-bold text-gray-900 dark:text-white w-full group-hover:border-indigo-500 transition-colors flex items-center justify-between">
                      <span>{endDate ? formatDateString(endDate) : "Select..."}</span>
                      <Calendar size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || undefined}
                      onClick={(e) => {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          try { (e.target as any).showPicker(); } catch (err) { }
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setChartSummaryData(summaryData);
                      setIsDatePickerOpen(false);
                    }}
                    className="w-1/3 h-14 bg-gray-100 dark:bg-gray-800 text-rose-500 font-black uppercase tracking-widest rounded-2xl text-xs active:scale-95 transition-all"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      setIsDatePickerOpen(false);
                    }}
                    disabled={!startDate || !endDate}
                    className="flex-1 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl text-sm disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/20"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
