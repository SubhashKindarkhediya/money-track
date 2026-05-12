import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Home,
  Wallet,
  Users,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  UserCircle,
  Plus,
  User,
  ChevronDown,
  PlusCircle,
  Bell,
  IndianRupee,
  UserPlus,
  Coins,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  UserX,
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Person from "./pages/Person";
import AddTransaction from "./pages/AddTransaction";
import TransactionHistory from "./pages/TransactionHistory";
// import { Sun, Moon } from "lucide-react";
import { useTheme } from "./context/ThemeContext";

// inside component
// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black transition-all animate-pulse text-indigo-600">
        LOADING...
      </div>
    );
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
};

const Card = ({
  title,
  amount,
  type,
  isVisible,
  onToggle,
}: {
  title: string;
  amount: string;
  type: "credit" | "debit" | "balance";
  isVisible: boolean;
  onToggle: () => void;
}) => {
  const styles = {
    credit: {
      icon: <TrendingUp className="text-emerald-700 dark:text-emerald-400" size={28} />,
      iconBg: "bg-white/60 dark:bg-emerald-500/20",
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5",
      border: "border-emerald-200/60 dark:border-emerald-500/20",
      text: "text-emerald-900 dark:text-white",
      label: "text-emerald-600 dark:text-emerald-400",
      btn: "text-emerald-600 hover:text-emerald-800 bg-emerald-100/50 hover:bg-emerald-200/50 dark:bg-emerald-500/20 dark:text-emerald-400"
    },
    debit: {
      icon: <TrendingDown className="text-rose-700 dark:text-rose-400" size={28} />,
      iconBg: "bg-white/60 dark:bg-rose-500/20",
      bg: "bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-500/10 dark:to-rose-500/5",
      border: "border-rose-200/60 dark:border-rose-500/20",
      text: "text-rose-900 dark:text-white",
      label: "text-rose-600 dark:text-rose-400",
      btn: "text-rose-600 hover:text-rose-800 bg-rose-100/50 hover:bg-rose-200/50 dark:bg-rose-500/20 dark:text-rose-400"
    },
    balance: {
      icon: <Wallet className="text-indigo-700 dark:text-indigo-400" size={28} />,
      iconBg: "bg-white/60 dark:bg-indigo-500/20",
      bg: "bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-500/10 dark:to-indigo-500/5",
      border: "border-indigo-200/60 dark:border-indigo-500/20",
      text: "text-indigo-900 dark:text-white",
      label: "text-indigo-600 dark:text-indigo-400",
      btn: "text-indigo-600 hover:text-indigo-800 bg-indigo-100/50 hover:bg-indigo-200/50 dark:bg-indigo-500/20 dark:text-indigo-400"
    },
  };

  const current = styles[type];

  return (
    <div className={`flex items-center justify-between p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-indigo-900/5 dark:shadow-none border h-full mx-2 transition-transform hover:-translate-y-1 duration-300 ${current.bg} ${current.border}`}>

      {/* Icon Area */}
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${current.iconBg}`}>
        {current.icon}
      </div>

      {/* Content Area */}
      <div className="flex-1 px-5">
        <h3 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-1.5 ${current.text}`}>
          <span className={`font-sans text-lg sm:text-xl ${current.label}`}>₹</span>
          {isVisible ? amount : "*****"}
        </h3>
        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${current.label}`}>
          {title}
        </p>
      </div>

      {/* Eye Toggle */}
      <button
        onClick={onToggle}
        className={`p-3 transition-colors rounded-xl shrink-0 ${current.btn}`}
      >
        {isVisible ? <Eye size={22} /> : <EyeOff size={22} />}
      </button>

    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibility, setVisibility] = useState([false, false, false]);
  const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, netBalance: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const { user } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Dismiss mobile keyboard on mount with a small delay
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }, 100);

    // Show onboarding tooltip for new users with a smooth delay
    const checkTooltip = () => {
      const userData = user || JSON.parse(localStorage.getItem("user") || "{}");
      const userKey = userData?.id || userData?.email;

      if (userKey) {
        const hasSeen = localStorage.getItem(`hasSeenFabTooltip_${userKey}`);
        if (hasSeen !== "true") {
          console.log("Showing onboarding tooltip for:", userKey);
          setTimeout(() => setShowTooltip(true), 800);
        }
      }
    };

    checkTooltip();
  }, [user]);

  const handleCloseTooltip = () => {
    const userData = user || JSON.parse(localStorage.getItem("user") || "{}");
    const userKey = userData?.id || userData?.email;
    if (userKey) {
      localStorage.setItem(`hasSeenFabTooltip_${userKey}`, "true");
    }
    setShowTooltip(false);
  };

  const toggleVisibility = (index: number) => {
    setVisibility(prev => prev.map((v, i) => i === index ? !v : v));
  };

  // Fetch dashboard summary and recent transactions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setSummaryLoading(true);
        const { default: api } = await import("./services/api");
        const [sumRes, txRes] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/transactions")
        ]);

        const { udhar } = sumRes.data.data;
        setSummary({ totalCredit: udhar.totalCredit || 0, totalDebit: udhar.totalDebit || 0, netBalance: udhar.netBalance || 0 });

        if (Array.isArray(txRes.data)) {
          const pendingTxs = txRes.data.filter((tx: any) => tx.status === "pending");
          setRecentTransactions(pendingTxs.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchData();
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cards = [
    { id: 0, title: "Total Credit", amount: summaryLoading ? "..." : fmt(summary.totalCredit), type: "credit" as const },
    { id: 1, title: "Total Debit", amount: summaryLoading ? "..." : fmt(summary.totalDebit), type: "debit" as const },
  ];

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollPosition = scrollRef.current.scrollLeft;
      const childWidth = scrollRef.current.children[0]?.clientWidth || 1;
      const index = Math.round(scrollPosition / childWidth);
      setActiveIndex(index);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const childWidth = scrollRef.current.children[0]?.clientWidth || 0;
        const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
        if (maxScroll <= 0) return;
        let nextIndex = activeIndex + 1;
        if (nextIndex >= cards.length) nextIndex = 0;
        scrollRef.current.scrollTo({ left: nextIndex * childWidth, behavior: 'smooth' });
        setActiveIndex(nextIndex);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [activeIndex]);

  const scrollTo = (index: number) => {
    if (scrollRef.current) {
      const childWidth = scrollRef.current.children[0]?.clientWidth || 0;
      scrollRef.current.scrollTo({ left: index * childWidth, behavior: 'smooth' });
      setActiveIndex(index);
    }
  };

  const fabOptions = [
    {
      label: "Give Money",
      icon: <TrendingDown size={20} />,
      color: "bg-rose-500",
      path: "/add-transaction",
      state: { type: "debit" }
    },
    {
      label: "Receive Money",
      icon: <TrendingUp size={20} />,
      color: "bg-emerald-500",
      path: "/add-transaction",
      state: { type: "credit" }
    }
  ];

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Financial <span className="text-indigo-600">Overview</span>
          </h2>
          <p className="text-gray-500 text-sm font-medium">
            Manage your digital finances with precision.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative -mx-6 md:mx-0">
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar scroll-smooth pb-4 px-4 md:px-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {cards.map((card) => (
              <div key={card.id} className="w-full md:w-1/2 lg:w-1/3 shrink-0 snap-center">
                <Card
                  title={card.title}
                  amount={card.amount}
                  type={card.type}
                  isVisible={visibility[card.id]}
                  onToggle={() => toggleVisibility(card.id)}
                />
              </div>
            ))}
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-2 mt-2 lg:hidden">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${activeIndex === index
                  ? "w-8 bg-indigo-600 dark:bg-indigo-500"
                  : "w-2 bg-gray-300 dark:bg-gray-700 hover:bg-indigo-400"
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-md dark:bg-gray-800/40 rounded-[2.5rem] p-8 border border-indigo-50 dark:border-gray-700/50 shadow-xl shadow-indigo-900/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">Recent Activity</h3>
            <button onClick={() => navigate('/transactions')} className="text-sm font-bold text-indigo-600 hover:underline">View All</button>
          </div>

          {summaryLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-30">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <History size={24} className="text-gray-400" />
              </div>
              <p className="font-bold tracking-wide">No activity detected yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 dark:bg-[#151624] border border-gray-100 dark:border-gray-800/80 hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 ${tx.type === "credit"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                      }`}>
                      {tx.type === "credit" ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        {tx.Person ? tx.Person.name : "Unknown"}
                      </h4>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {new Date(tx.date || tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <div className={`text-base font-black shrink-0 whitespace-nowrap ml-3 ${tx.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                    {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB Backdrop */}
      {isFabOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] transition-opacity duration-300"
          onClick={() => setIsFabOpen(false)}
        />
      )}

      {/* Floating Add Transaction Menu */}
      <div className="fixed bottom-28 right-6 lg:bottom-10 lg:right-10 z-[100] flex flex-col items-end gap-8">
        {/* FAB Options */}
        <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${isFabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}>
          {fabOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <span className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 opacity-100 transition-opacity">
                {opt.label}
              </span>
              <button
                onClick={() => {
                  setIsFabOpen(false);
                  navigate(opt.path, { state: opt.state });
                }}
                className={`w-12 h-12 ${opt.color} text-white rounded-2xl shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95`}
              >
                {opt.icon}
              </button>
            </div>
          ))}
        </div>

        {/* Main FAB */}
        <div className="relative">
          {/* Onboarding Tooltip */}
          {showTooltip && !isFabOpen && (
            <div className="absolute bottom-20 right-0 w-64 animate-in slide-in-from-bottom-2 duration-500">
              <div className="bg-indigo-600 text-white p-4 rounded-3xl shadow-2xl relative">
                <p className="text-sm font-bold leading-relaxed mb-3">
                  Tap here to add a new transaction
                </p>
                <button
                  onClick={handleCloseTooltip}
                  className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
                >
                  Got it!
                </button>
                {/* Dashed Line Decoration */}
                <div className="absolute -bottom-8 right-10 w-16 h-8 overflow-hidden">
                  <svg className="w-full h-full text-indigo-600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8">
                    <path d="M10 10 Q 50 10 90 90" />
                    <path d="M85 70 L 90 90 L 70 85" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.5)] border border-indigo-400/30 flex items-center justify-center transition-all duration-500 ${isFabOpen ? "rotate-[135deg] bg-slate-800 scale-90" : "hover:scale-110"}`}
          >
            <Plus size={26} />
          </button>
        </div>
      </div>
    </>
  );
};

function AppContent() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [isAddTxOpen, setAddTxOpen] = useState(false);
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifPill, setShowNotifPill] = useState(false);
  const [notifScreenOpen, setNotifScreenOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'activity'>('requests');

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { default: api } = await import("./services/api");
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Set default tab based on pending counts when opening screen
  useEffect(() => {
    if (notifScreenOpen) {
      const pendingRequests = notifications.filter(n => n.type === 'request' && n.status === 'pending').length;
      if (pendingRequests > 0) {
        setActiveTab('requests');
      } else {
        setActiveTab('activity');
      }
    }
  }, [notifScreenOpen]);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    try {
      const { default: api } = await import("./services/api");
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const getDayGroup = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return 'Earlier';
  };

  // Map notifications to requests (only those received by the user)
  const requests = notifications.filter(n => n.type === 'request' && n.recipient_id === user?.id).map(n => ({
    id: n.id,
    name: n.data?.senderName || n.sender?.name || 'Unknown',
    status: n.status,
    subType: n.data?.subType || 'incoming',
    responseStatus: n.data?.status, // The actual accepted/rejected value
    message: n.data?.message,
    date: getDayGroup(n.createdAt),
    initial: (n.data?.senderName || n.sender?.name || 'U')[0].toUpperCase(),
    isRead: n.status !== 'pending'
  }));

  // Map notifications to activities (transactions only)
  const activities = notifications.filter(n =>
    (n.type === 'transaction' || n.type === 'system') && n.recipient_id === user?.id
  ).map(n => ({
    id: n.id,
    type: n.data?.type || 'received',
    amount: n.data?.amount || 0,
    person: n.data?.personName || n.data?.senderName || 'Someone',
    date: getDayGroup(n.createdAt),
    time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isRead: n.status === 'read',
    message: n.data?.message,
    autoAdded: n.data?.autoAdded || false,
    subType: n.data?.subType || null,
    responseStatus: n.data?.status || null,
  }));

  const handleAccept = async (id: string) => {
    try {
      const { default: api } = await import("./services/api");
      await api.patch(`/notifications/${id}/response`, { status: 'accepted' });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { default: api } = await import("./services/api");
      await api.patch(`/notifications/${id}/response`, { status: 'rejected' });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to reject request", err);
    }
  };

  // Handle Notification Pill Delay and Auto-hide on Dashboard
  useEffect(() => {
    if (location.pathname === "/") {
      setShowNotifPill(false);
      const showTimer = setTimeout(() => {
        const pendingCount = notifications.filter(n => n.status === 'pending' && n.recipient_id === user?.id).length;
        if (pendingCount > 0) {
          setShowNotifPill(true);
        }
      }, 1200);
      const hideTimer = setTimeout(() => setShowNotifPill(false), 7000); // Hide after ~6s of visibility
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setShowNotifPill(false);
    }
  }, [location.pathname, notifications]);

  // Global: Close keyboard on every route change
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [location.pathname]);

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";
  const isProfilePage = location.pathname === "/profile";
  const isPersonPage = location.pathname.startsWith("/person");
  const isAddTransactionPage = location.pathname === "/add-transaction";
  const isLogPage = location.pathname === "/transactions";
  const isFullScreenPage = isProfilePage || isPersonPage || isAddTransactionPage || isLogPage;

  // Show bottom nav only on exact main tab paths
  const mainTabs = ["/", "/person", "/transactions", "/profile"];
  const showBottomNav = mainTabs.includes(location.pathname);

  const navigation = [
    { name: "Home", icon: Home, path: "/", color: "from-blue-500 to-indigo-600", lightBg: "bg-blue-50", darkBg: "dark:bg-blue-500/10" },
    { name: "Person List", icon: Users, path: "/person", color: "from-emerald-500 to-teal-600", lightBg: "bg-emerald-50", darkBg: "dark:bg-emerald-500/10" },
    { name: "History", icon: History, path: "/transactions", color: "from-amber-500 to-orange-600", lightBg: "bg-amber-50", darkBg: "dark:bg-amber-500/10" },
    { name: "Profile", icon: UserCircle, path: "/profile", color: "from-purple-500 to-pink-600", lightBg: "bg-purple-50", darkBg: "dark:bg-purple-500/10" },
  ];
  const { theme, toggleTheme } = useTheme();

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    );
  }

  return (
    <div className={`flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-500 overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900`}>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Navigation Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-[70] transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-full lg:w-24 lg:translate-x-0"}
        bg-white/90 backdrop-blur-2xl dark:bg-gray-800 border-r border-indigo-100/50 dark:border-gray-700 flex flex-col p-5 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] dark:shadow-none
      `}
      >
        <div className="flex items-center justify-between mb-10 px-2">
          <div
            className={`flex items-center gap-3 ${!isSidebarOpen && "lg:justify-center w-full"}`}
          >
            <div className="min-w-[48px] h-[48px] bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 dark:shadow-none transform hover:rotate-12 transition-transform">
              <Wallet size={24} />
            </div>
            {isSidebarOpen && (
              <span className="text-xl font-black tracking-tighter text-gray-900 dark:text-white">
                Money Track
              </span>
            )}
            {!isSidebarOpen && (
              <span className="lg:hidden text-2xl font-black tracking-tighter text-gray-900 dark:text-white">
                Money Track
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {navigation.filter(item => item.name !== "Profile").map((item) => (
            <React.Fragment key={item.name}>
              <NavLink
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group
                  ${isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-500/30 dark:shadow-none"
                    : "text-gray-500 hover:bg-indigo-50/80 dark:hover:bg-gray-700/50 hover:text-indigo-600"
                  }
                  ${!isSidebarOpen && "lg:justify-center"}
                `}
              >
                <item.icon
                  size={22}
                  className="shrink-0 transition-transform group-hover:scale-110"
                />
                <span
                  className={`font-bold tracking-wide text-[11px] ${!isSidebarOpen && "lg:hidden"}`}
                >
                  {item.name}
                </span>
                {isSidebarOpen && (
                  <div className="ml-auto w-1 h-1 bg-current rounded-full opacity-50 group-hover:opacity-100"></div>
                )}
              </NavLink>

              {/* Add Transaction Dropdown (Only after Person List) */}
              {item.name === "Person List" && isSidebarOpen && (
                <div className="space-y-1">
                  <button
                    onClick={() => setAddTxOpen(!isAddTxOpen)}
                    className={`flex items-center gap-4 p-4 rounded-2xl w-full transition-all duration-300 group
                      ${isAddTxOpen ? "bg-indigo-50/80 dark:bg-gray-700/50 text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:bg-indigo-50/80 dark:hover:bg-gray-700/50 hover:text-indigo-600"}
                    `}
                  >
                    <PlusCircle size={22} className={`shrink-0 transition-transform ${isAddTxOpen ? "rotate-45" : ""}`} />
                    <span className="font-bold tracking-wide text-[11px]">Add Transaction</span>
                    <ChevronDown size={14} className={`ml-auto transition-transform duration-300 ${isAddTxOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isAddTxOpen && (
                    <div className="pl-4 pr-2 space-y-1 animate-in slide-in-from-top-2 duration-300">
                      <button
                        onClick={() => {
                          setSidebarOpen(false);
                          navigate("/add-transaction", { state: { mode: "single" } });
                        }}
                        className="flex items-center gap-4 p-4 w-full text-left rounded-2xl text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:bg-indigo-50/80 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                      >
                        <User size={18} className="shrink-0 ml-1" />
                        <span>Person Transaction</span>
                      </button>
                      <button
                        onClick={() => {
                          setSidebarOpen(false);
                          navigate("/add-transaction", { state: { mode: "group" } });
                        }}
                        className="flex items-center gap-4 p-4 w-full text-left rounded-2xl text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:bg-indigo-50/80 dark:hover:bg-gray-700/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                      >
                        <Users size={18} className="shrink-0 ml-1" />
                        <span>Group Transaction</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-50 dark:border-gray-700/50 pt-6">
          <button
            onClick={() => {
              logout();
              setSidebarOpen(false);
            }}
            className={`
              flex items-center gap-4 p-4 rounded-2xl w-full text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-300
              ${!isSidebarOpen && "lg:justify-center"}
            `}
          >
            <LogOut size={22} />
            <span
              className={`font-bold text-[11px] tracking-wide ${!isSidebarOpen && "lg:hidden"}`}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative">
        {/* Header - Only visible on non-auth and non-fullscreen pages */}
        {!isFullScreenPage && (
          <header
            className={`
              h-20 lg:h-24 sticky top-0 z-50 flex items-center justify-between px-4 lg:px-12
              bg-white/70 dark:bg-gray-900/80 backdrop-blur-2xl border-b border-indigo-100/50 dark:border-gray-800/50 shadow-sm shadow-indigo-900/5
            `}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-500 shadow-sm hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu size={22} />
              </button>

              <div className="lg:hidden text-left font-black tracking-tighter text-xl text-gray-900 dark:text-white">
                Money Track
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
              {/* 🌙 THEME TOGGLE */}
              <button
                onClick={toggleTheme}
                className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
                aria-label="Toggle Theme"
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              {/* 🔔 REQUESTS & NOTIFICATIONS (Middle) */}
              <div className="relative group/notif">
                <button
                  onClick={() => setNotifScreenOpen(true)}
                  className="relative p-2.5 bg-indigo-50/50 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-gray-700 transition-all active:scale-95"
                  aria-label="Notifications"
                >
                  <Bell size={20} className={showNotifPill ? "animate-bell-ring" : ""} />

                  {/* Numeric Notification Badge - Only for Received & Pending */}
                  {notifications.filter(n => n.status === 'pending' && n.recipient_id === user?.id).length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                      {notifications.filter(n => n.status === 'pending' && n.recipient_id === user?.id).length > 9 ? '9+' : notifications.filter(n => n.status === 'pending' && n.recipient_id === user?.id).length}
                    </span>
                  )}
                </button>

                {/* 🚀 INSTAGRAM STYLE FLOATING POPUP (Only on Dashboard with state delay) */}
                {showNotifPill && (
                  <div className="absolute top-[calc(100%+8px)] right-0 flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-indigo-600 rounded-full shadow-[0_10px_30px_-10px_rgba(79,70,229,0.4)] border border-indigo-100 dark:border-indigo-500/30 z-50 animate-in fade-in slide-in-from-top-4 duration-700 fill-mode-both">
                    {/* Requests Count */}
                    {requests.filter(r => r.status === 'pending').length > 0 && (
                      <div className={`flex items-center gap-1.5 ${activities.filter(a => !a.isRead).length > 0 ? "border-r border-indigo-100 dark:border-indigo-500/30 pr-2" : ""}`}>
                        <UserPlus size={13} className="text-indigo-600 dark:text-indigo-100" />
                        <span className="text-[10px] font-black text-indigo-900 dark:text-white">{requests.filter(r => r.status === 'pending').length}</span>
                      </div>
                    )}
                    {/* Transaction Count */}
                    {activities.filter(a => !a.isRead).length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">💸</span>
                        <span className="text-[10px] font-black text-indigo-900 dark:text-white">{activities.filter(a => !a.isRead).length}</span>
                      </div>
                    )}

                    {/* Little Arrow/Pointer */}
                    <div className="absolute -top-1 right-4 w-2 h-2 bg-white dark:bg-indigo-600 border-l border-t border-indigo-100 dark:border-indigo-500/30 rotate-45"></div>
                  </div>
                )}
              </div>

              <button onClick={() => setProfileDrawerOpen(true)} className="flex items-center gap-3 sm:gap-5 group outline-none ml-5">
                <div className="hidden md:block text-right transition-transform group-hover:-translate-x-1">
                  <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                    {user?.name || "User"}
                  </p>
                  <p className="text-[10px] font-black text-indigo-500 tracking-widest">
                    Premium Tier
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1rem] bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg transform group-hover:-rotate-12 group-hover:scale-105 transition-all cursor-pointer">
                  <div className="w-full h-full rounded-[0.8rem] sm:rounded-[0.85rem] bg-indigo-50 dark:bg-gray-900 flex items-center justify-center border-2 border-white dark:border-gray-900">
                    <span className="font-black text-indigo-600 text-base sm:text-lg">
                      {user?.name ? user.name[0].toUpperCase() : "U"}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </header>
        )}

        {/* Protected Routing */}
        <div className={`mb-28 lg:mb-0 max-w-7xl mx-auto w-full ${isFullScreenPage ? '' : 'p-6 md:p-12 lg:p-16'}`}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/person"
              element={
                <ProtectedRoute>
                  <Person />
                </ProtectedRoute>
              }
            />
            <Route
              path="/person/:id"
              element={
                <ProtectedRoute>
                  <Person />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <TransactionHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-transaction"
              element={
                <ProtectedRoute>
                  <AddTransaction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <div className="py-20 text-center font-bold text-gray-300">
                    Settings View Coming Soon
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>

        {/* Mobile Navigation Bar */}
        {showBottomNav && (
          <nav className="fixed bottom-1 left-4 right-4 h-22 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-indigo-100/50 dark:border-gray-800/50 lg:hidden grid grid-cols-4 items-center px-2 z-[55] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.2)] dark:shadow-none rounded-[2rem] max-w-lg mx-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `
                flex flex-col items-center justify-center gap-1.5 py-2 transition-all relative
                ${isActive ? "scale-110" : "opacity-80"}
              `}
              >
                {({ isActive }) => (
                  <>
                    <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                    ${isActive
                        ? `bg-gradient-to-br ${item.color} text-white shadow-lg shadow-indigo-500/20`
                        : `${item.lightBg} ${item.darkBg} text-gray-600`
                      }
                  `}>
                      <item.icon
                        size={20}
                        className={`transition-all duration-500 ${isActive ? "rotate-[360deg]" : ""}`}
                      />
                    </div>
                    <span className={`text-[10px] font-black tracking-[0.05em] transition-colors duration-300 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500"}`}>
                      {item.name}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-1 w-6 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-in zoom-in-50 duration-300"></div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Profile Bottom Drawer */}
        {isProfileDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300 flex flex-col justify-end"
            onClick={() => setProfileDrawerOpen(false)}
          >
            <div
              className="bg-white dark:bg-[#151624] rounded-t-[2.5rem] p-6 sm:p-8 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-300 sm:max-w-md sm:mx-auto sm:w-full sm:rounded-[2.5rem] sm:mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8 sm:hidden"></div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setProfileDrawerOpen(false); navigate("/profile"); }}
                  className="flex items-center gap-5 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#1a1b2a] transition-all active:scale-[0.98] w-full text-left group"
                >
                  <div className="p-3.5 bg-indigo-50 dark:bg-[#1e1f30] text-indigo-600 dark:text-indigo-400 rounded-[1.2rem] group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <UserCircle size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white text-base">My Profile</h4>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">View and edit your details</p>
                  </div>
                </button>

                <button
                  onClick={() => { setProfileDrawerOpen(false); navigate("/settings"); }}
                  className="flex items-center gap-5 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#1a1b2a] transition-all active:scale-[0.98] w-full text-left group"
                >
                  <div className="p-3.5 bg-indigo-50 dark:bg-[#1e1f30] text-indigo-600 dark:text-indigo-400 rounded-[1.2rem] group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white text-base">Settings</h4>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide">App preferences</p>
                  </div>
                </button>

                <div className="h-px bg-gray-100 dark:bg-gray-800 my-2"></div>

                <button
                  onClick={() => { setProfileDrawerOpen(false); logout(); }}
                  className="flex items-center gap-5 p-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-[0.98] w-full text-left group"
                >
                  <div className="p-3.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-[1.2rem] group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <LogOut size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-red-600 dark:text-red-400 text-base">Logout</h4>
                    <p className="text-xs font-bold text-red-500/70 dark:text-red-400/70 tracking-wide">Sign out safely</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* 🔔 FULL SCREEN NOTIFICATION MODAL */}
        {notifScreenOpen && (
          <div className="fixed inset-0 z-[110] bg-gray-50 dark:bg-gray-900 animate-in slide-in-from-bottom duration-500 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-20 lg:h-24 flex items-center px-4 lg:px-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-indigo-100/50 dark:border-gray-800/50 sticky top-0 z-[120]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setNotifScreenOpen(false)}
                  className="p-2.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                >
                  <ArrowLeft size={22} />
                </button>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Notifications</h2>
                </div>
              </div>
            </header>

            {/* Tabs */}
            <div className="flex p-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'requests'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                Requests <span className="ml-1 opacity-60">({requests.filter(r => (r.subType === 'incoming' && (r.status === 'pending' || r.status === 'read')) || (r.subType === 'response' && r.status === 'pending')).length})</span>
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'activity'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                Activity <span className="ml-1 opacity-60">({activities.length})</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-12 scrollbar-hide bg-gray-50 dark:bg-gray-950/50">
              {activeTab === 'requests' ? (
                <div className="max-w-2xl mx-auto space-y-8">
                  {/* Grouped by Date: Today */}
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Today</h3>
                    <div className="space-y-3">
                      {requests.filter(r => r.date === 'Today').map(req => {
                        const cardStatus = req.subType === 'response' ? req.responseStatus : req.status;
                        return (
                        <div
                          key={req.id}
                          onClick={() => req.subType === 'response' && !req.isRead && markAsRead(req.id)}
                          className={`relative bg-white dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-4 transition-all group overflow-hidden ${
                            req.subType === 'response'
                              ? `cursor-pointer ${!req.isRead ? 'hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5' : 'opacity-70'} ${cardStatus === 'accepted' ? 'bg-emerald-50/30 dark:bg-emerald-500/5' : 'bg-rose-50/30 dark:bg-rose-500/5'}`
                              : ''
                          }`}>
                          {/* Left Accent Strip - Only for Responses */}
                          {req.subType === 'response' && (cardStatus === 'accepted' || cardStatus === 'rejected') && (
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                              cardStatus === 'accepted' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                          )}
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">{req.initial}</div>
                            <div>
                              <p className={`text-sm tracking-tight ${!req.isRead ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-600 dark:text-gray-400'}`}>{req.name}</p>
                              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                {req.subType === 'response' ? (req.responseStatus === 'accepted' ? 'Accepted your request' : 'Rejected your request') : 'Wants to connect'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {(req.subType === 'incoming' && (req.status === 'pending' || req.status === 'read')) ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleAccept(req.id)}
                                  className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleReject(req.id)}
                                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : req.status === 'accepted' ? (
                              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 dark:border-emerald-500/20 animate-in zoom-in duration-300">
                                ✓ Accepted
                              </div>
                            ) : req.status === 'rejected' ? (
                              <div className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-100 dark:border-rose-500/20 animate-in zoom-in duration-300">
                                ✕ Rejected
                              </div>
                            ) : null}

                            {/* Unread dot for response notifications */}
                            {req.subType === 'response' && !req.isRead && (
                              <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)] animate-pulse shrink-0" />
                            )}
                          </div>
                        </div>
                        );
                      })}
                      {requests.filter(r => r.date === 'Today').length === 0 && (
                        <p className="text-center py-4 text-xs font-bold text-gray-400">No requests today</p>
                      )}
                    </div>
                  </div>

                  {/* Grouped by Date: Earlier */}
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2 mt-8">Earlier</h3>
                    <div className="space-y-3">
                      {requests.filter(r => r.date !== 'Today').map(req => {
                        const cardStatus = req.subType === 'response' ? req.responseStatus : req.status;
                        return (
                        <div
                          key={req.id}
                          onClick={() => req.subType === 'response' && !req.isRead && markAsRead(req.id)}
                          className={`bg-white dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-4 transition-all opacity-80 overflow-hidden relative ${
                            req.subType === 'response'
                              ? `cursor-pointer ${!req.isRead ? 'hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5' : ''} ${cardStatus === 'accepted' ? 'bg-emerald-50/20 dark:bg-emerald-500/5' : 'bg-rose-50/20 dark:bg-rose-500/5'}`
                              : ''
                          }`}>
                          {/* Left Accent Strip - Only for Responses */}
                          {req.subType === 'response' && (cardStatus === 'accepted' || cardStatus === 'rejected') && (
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                              cardStatus === 'accepted' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                          )}
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-black">{req.initial}</div>
                            <div>
                              <p className="font-black text-gray-900 dark:text-white text-sm">{req.name}</p>
                              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                {req.subType === 'response' ? (req.responseStatus === 'accepted' ? 'Accepted your request' : 'Rejected your request') : 'Sent request'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {(req.subType === 'incoming' && (req.status === 'pending' || req.status === 'read')) ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleAccept(req.id)}
                                  className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleReject(req.id)}
                                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-lg"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : req.status === 'accepted' ? (
                              <div className="px-4 py-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest">✓ Accepted</div>
                            ) : req.status === 'rejected' ? (
                              <div className="px-4 py-2 text-rose-500 text-[10px] font-black uppercase tracking-widest">✕ Rejected</div>
                            ) : null}

                            {/* Unread dot for response notifications */}
                            {req.subType === 'response' && !req.isRead && (
                              <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)] animate-pulse shrink-0" />
                            )}
                          </div>
                        </div>
                        );
                      })}
                      {requests.filter(r => r.date !== 'Today').length === 0 && (
                        <p className="text-center py-4 text-xs font-bold text-gray-400">No older requests</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-8">
                  {/* Today's Activity */}
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Today</h3>
                    <div className="space-y-3">
                      {activities.filter(a => a.date === 'Today').map(act => (
                        <div 
                          key={act.id} 
                          onClick={() => !act.isRead && markAsRead(act.id)}
                          className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                          !act.isRead ? 'bg-indigo-50/30 dark:bg-indigo-500/5 hover:bg-indigo-100/40 dark:hover:bg-indigo-500/10' : 'opacity-60 bg-transparent'
                        }`}>
                          {/* Icon — connection response or transaction */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            act.subType === 'response'
                              ? (act.responseStatus === 'accepted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10')
                              : (act.type === 'received' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10')
                          }`}>
                            {act.subType === 'response'
                              ? (act.responseStatus === 'accepted' ? <UserCheck size={18} /> : <UserX size={18} />)
                              : (act.type === 'received' ? <TrendingUp size={18} /> : <TrendingDown size={18} />)
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!act.isRead ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-600 dark:text-gray-400'}`}>
                               {act.message || `${act.type === 'received' ? 'Received' : 'Sent'} ₹${act.amount} ${act.type === 'received' ? 'from' : 'to'} ${act.person}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{act.time}</span>
                              {act.autoAdded && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-tighter rounded-md border border-indigo-100 dark:border-indigo-500/20">
                                  <RefreshCw size={8} /> Synced
                                </span>
                              )}
                            </div>
                          </div>
                          {!act.isRead && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)] animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      ))}
                      {activities.filter(a => a.date === 'Today').length === 0 && (
                        <p className="text-center py-4 text-xs font-bold text-gray-400">No activity today</p>
                      )}
                    </div>
                  </div>

                  {/* Earlier Activity */}
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2 mt-8">Earlier</h3>
                    <div className="space-y-3">
                      {activities.filter(a => a.date !== 'Today').map(act => (
                        <div 
                          key={act.id} 
                          onClick={() => !act.isRead && markAsRead(act.id)}
                          className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                          !act.isRead ? 'bg-indigo-50/30 dark:bg-indigo-500/5 hover:bg-indigo-100/40 dark:hover:bg-indigo-500/10' : 'opacity-60 bg-transparent'
                        }`}>
                          {/* Icon — connection response or transaction */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            act.subType === 'response'
                              ? (act.responseStatus === 'accepted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10')
                              : (act.type === 'received' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10')
                          }`}>
                            {act.subType === 'response'
                              ? (act.responseStatus === 'accepted' ? <UserCheck size={18} /> : <UserX size={18} />)
                              : (act.type === 'received' ? <TrendingUp size={18} /> : <TrendingDown size={18} />)
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!act.isRead ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-600 dark:text-gray-400'}`}>
                               {act.message || `${act.type === 'received' ? 'Received' : 'Sent'} ₹${act.amount} ${act.type === 'received' ? 'from' : 'to'} ${act.person}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{act.time}</span>
                              {act.autoAdded && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-tighter rounded-md border border-indigo-100 dark:border-indigo-500/20">
                                  <RefreshCw size={8} /> Synced
                                </span>
                              )}
                            </div>
                          </div>
                          {!act.isRead && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)] animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      ))}
                      {activities.filter(a => a.date !== 'Today').length === 0 && (
                        <p className="text-center py-4 text-xs font-bold text-gray-400">No older activity</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
