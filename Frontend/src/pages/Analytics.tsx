import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from "recharts";
import { 
  ArrowLeft, Calendar, TrendingUp, TrendingDown, 
  PieChart as PieChartIcon, BarChart3, ChevronLeft, ChevronRight,
  Filter, Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/report?month=${selectedMonth}&year=${selectedYear}`);
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

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

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white dark:bg-[#151624] p-5 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3 group hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
          <Icon className={color.replace("bg-", "text-")} size={20} />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <h4 className="text-xl font-black text-gray-900 dark:text-white mt-1">₹{value.toLocaleString("en-IN")}</h4>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto w-full font-sans pb-24 animate-in slide-in-from-bottom-6 duration-300">
      {/* Header */}
      <div className="sticky top-0 z-30 px-6 py-4 bg-white/70 dark:bg-[#0a0a1a]/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-gray-50 dark:bg-[#151624] hover:bg-gray-100 dark:hover:bg-[#1e1f30] transition-colors border border-gray-100 dark:border-gray-800"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-widest text-center">
              FINANCIAL INSIGHTS
            </h2>
          </div>
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
             <Activity size={20} />
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-[#151624] p-2 rounded-2xl border border-gray-100 dark:border-gray-800">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" />
            <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {months[selectedMonth - 1]} {selectedYear}
            </span>
          </div>
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="px-5 mt-8 space-y-8">
        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Monthly Income" 
            value={data?.summary?.income || 0} 
            icon={TrendingUp} 
            color="bg-emerald-500" 
          />
          <StatCard 
            title="Monthly Expense" 
            value={data?.summary?.expense || 0} 
            icon={TrendingDown} 
            color="bg-rose-500" 
          />
          <StatCard 
            title="Pending Credit" 
            value={data?.summary?.credit || 0} 
            icon={Filter} 
            color="bg-indigo-500" 
          />
          <StatCard 
            title="Pending Debit" 
            value={data?.summary?.debit || 0} 
            icon={Activity} 
            color="bg-amber-500" 
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-gray-400 animate-pulse">Analyzing your data...</p>
          </div>
        ) : chartData.length === 0 ? (
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
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#888'}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#888'}}
                      tickFormatter={(val) => `₹${val}`}
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

            {/* Distribution Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-[#151624] p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <PieChartIcon size={16} className="text-indigo-500" /> Distribution
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        animationBegin={200}
                        animationDuration={1000}
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-[#151624] p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChart3 size={16} className="text-indigo-500" /> Comparison
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(-7)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip 
                         contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="credit" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="debit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Credit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Debit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
