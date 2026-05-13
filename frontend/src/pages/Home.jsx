import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useProfile } from "../contexts/ProfileContext";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
  Download,
} from "lucide-react";
import { Modal } from "react-responsive-modal";
import "react-responsive-modal/styles.css";
import Skeleton from "react-loading-skeleton";

// --- API Helper ---
const getHeaders = () => {
  const token = localStorage.getItem("token");
  const profile = JSON.parse(localStorage.getItem("activeProfile") || "null");
  return { token, ...(profile?.id ? { "x-profile-id": profile.id } : {}) };
};

const calcPercent = (current, previous) => {
  if (!previous) return 0;
  const result = ((current - previous) / previous) * 100;
  return result === Infinity ? 0 : result;
};

// --- Sub-Components ---

const StatCard = ({ stat, loading }) => {
  if (loading) {
    return (
      <div className="glass-panel rounded-3xl p-5 lg:p-7 bg-white/40 dark:bg-slate-800/40">
        <Skeleton width="40%" height={10} />
        <Skeleton width="70%" height={30} className="mt-2" />
        <Skeleton width="50%" height={15} className="mt-4 rounded-full" />
      </div>
    );
  }

  const isPositive = stat.type === "positive";
  return (
    <div className="glass-panel rounded-2xl lg:rounded-3xl p-5 lg:p-7 transition-all hover:scale-[1.02] relative overflow-hidden group bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5">
      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0">
          <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] lg:text-[10px] truncate">
            {stat.title}
          </p>
          <h3 className="text-xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1.5 lg:mt-3 tracking-tighter truncate">
            {stat.value}
          </h3>
        </div>
        <div
          className={`p-2.5 lg:p-4 rounded-xl lg:rounded-2xl backdrop-blur-sm flex-shrink-0 ${isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
        >
          <stat.icon className="w-5 h-5 lg:w-7 lg:h-7" />
        </div>
      </div>
      <div className="mt-4 lg:mt-6 flex items-center gap-2 relative z-10">
        <span
          className={`text-[10px] lg:text-xs font-black px-2 py-0.5 rounded-lg ${isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}
        >
          {stat.change}%
        </span>
        <span className="text-[9px] lg:text-[10px] text-slate-400 font-black uppercase tracking-tighter">
          vs last
        </span>
      </div>
    </div>
  );
};

// --- Main Component ---

function Home() {
  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [stats, setStats] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  const initialFormState = {
    amount: "",
    category: "",
    date: "",
    title: "",
    expenseType: "expense",
  };
  const [formData, setFormData] = useState(initialFormState);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(totalExpenses / ITEMS_PER_PAGE);

  // --- Data Fetching ---

  const fetchDashboardData = async () => {
    if (!localStorage.getItem("token")) return navigate("/login");
    setLoading(true);

    try {
      // Fetch Expenses
      const expenseRes = await axios.get(
        "http://localhost:3000/api/expense/getall",
        {
          params: { currentPage },
          headers: getHeaders(),
        },
      );
      setRecentTransactions(expenseRes.data.data || []);
      setTotalExpenses(expenseRes.data.total || 0);

      // Fetch Categories
      const catRes = await axios.get("http://localhost:3000/api/categories/", {
        headers: getHeaders(),
      });
      setCategories(catRes.data);

      // Fetch Stats
      const statsRes = await axios.get(
        "http://localhost:3000/api/expense/states",
        { headers: getHeaders() },
      );
      const data = statsRes.data[0] || {};

      const income = data.current_income || 0;
      const expense = data.current_expense || 0;
      const balance = data.current_balance || 0;
      const lastIncome = data.last_income || 0;
      const lastExpense = data.last_expense || 0;
      const lastBalance = data.last_balance || 0;

      const burnRate = expense / 30;
      const spendEff = expense > 0 ? (expense / income) * 100 : 0;
      const saveEff = income > 0 ? ((income - expense) / income) * 100 : 0;

      // Build stats array dynamically
      setStats([
        {
          id: 1,
          title: "Total Income",
          value: income,
          change: calcPercent(income, lastIncome).toFixed(2),
          type: income >= lastIncome ? "positive" : "negative",
          icon: ArrowUpRight,
        },
        {
          id: 2,
          title: "Total Expense",
          value: expense,
          change: calcPercent(expense, lastExpense).toFixed(2),
          type: expense >= lastExpense ? "positive" : "negative",
          icon: ArrowDownRight,
        },
        {
          id: 3,
          title: "Net Balance",
          value: balance,
          change: calcPercent(balance, lastBalance).toFixed(2),
          type: balance >= lastBalance ? "positive" : "negative",
          icon: DollarSign,
        },
        {
          id: 4,
          title: "Burn Rate",
          value: burnRate.toFixed(2),
          change: calcPercent(burnRate, lastExpense / 30).toFixed(2),
          type: burnRate >= lastExpense / 30 ? "positive" : "negative",
          icon: Flame,
        },
        {
          id: 5,
          title: "Efficiency",
          value: spendEff.toFixed(2),
          change: calcPercent(
            spendEff,
            lastExpense > 0 ? (lastIncome / lastExpense) * 100 : 0,
          ).toFixed(2),
          type:
            calcPercent(
              spendEff,
              lastExpense > 0 ? (lastIncome / lastExpense) * 100 : 0,
            ) > 0
              ? "positive"
              : "negative",
          icon: DollarSign,
        },
        {
          id: 6,
          title: "Savings",
          value: saveEff.toFixed(2),
          change: calcPercent(
            saveEff,
            lastIncome > 0
              ? ((lastIncome - lastExpense) / lastIncome) * 100
              : 0,
          ).toFixed(2),
          type:
            calcPercent(
              saveEff,
              lastIncome > 0
                ? ((lastIncome - lastExpense) / lastIncome) * 100
                : 0,
            ) > 0
              ? "positive"
              : "negative",
          icon: Wallet,
        },
      ]);
    } catch (error) {
      toast.error("Error fetching dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeProfile) {
      toast.error("Please select a profile");
      navigate("/profiles");
      return;
    }
    fetchDashboardData();
  }, [currentPage, activeProfile?.id]);

  // --- Handlers ---

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.amount ||
      !formData.category ||
      !formData.title ||
      !formData.date
    ) {
      return toast.error("Please fill all the fields");
    }

    try {
      await axios.post("http://localhost:3000/api/expense/add", formData, {
        headers: getHeaders(),
      });
      toast.success("Transaction added!");
      setIsModalOpen(false);
      setFormData(initialFormState);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast.error("Error Adding Transaction");
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/expense/export",
        { headers: getHeaders(), responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "expenses.csv");
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Expenses exported successfully");
    } catch (error) {
      toast.error("Error Exporting Expenses");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-2 lg:px-0 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tighter">
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-bold text-sm lg:text-base">
            Financial overview for <span className="text-blue-600">You</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 lg:py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-blue-600/30 active:scale-95 text-sm lg:text-base"
          >
            <Download className="w-5 h-5" /> Export CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 lg:py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-blue-600/30 active:scale-95 text-sm lg:text-base"
          >
            <Plus className="w-5 h-5" /> Add Entry
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        {stats.length === 0 && loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <StatCard key={i} loading={true} />
            ))
          : stats.map((stat) => (
              <StatCard key={stat.id} stat={stat} loading={false} />
            ))}
      </div>

      {/* Activity Feed */}
      <div className="glass-panel rounded-3xl lg:rounded-[2.5rem] overflow-hidden bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5 shadow-2xl">
        <div className="p-6 lg:p-8 border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/10">
          <h2 className="text-xl lg:text-2xl font-black tracking-tighter">
            Activity Feed
          </h2>
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-5 flex items-center gap-4">
                <Skeleton width={50} height={50} className="rounded-xl" />
                <div className="space-y-1 w-full">
                  <Skeleton width="30%" />
                  <Skeleton width="20%" />
                </div>
              </div>
            ))
          ) : recentTransactions.length === 0 ? (
            <div className="py-20 text-center opacity-30">
              <Wallet className="w-16 h-16 mx-auto mb-4" />
              <p className="font-black text-xl">No entries found</p>
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 lg:p-6 flex items-center justify-between hover:bg-white/50 dark:hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-3 lg:gap-5 min-w-0">
                  <div
                    className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${tx.expense_type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                  >
                    {tx.expense_type === "income" ? (
                      <ArrowUpRight className="w-5 h-5 lg:w-7 lg:h-7" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 lg:w-7 lg:h-7" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm lg:text-lg truncate group-hover:text-blue-600 transition-colors">
                      {tx.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 truncate">
                      <span
                        className="text-[8px] lg:text-[10px] font-black px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-slate-500 uppercase tracking-widest"
                        style={{ borderLeft: `3px solid ${tx.category_color}` }}
                      >
                        {tx.category_name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(tx.expense_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`font-black text-base lg:text-xl ${tx.expense_type === "income" ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {tx.expense_type === "income" ? "+" : "-"}$
                  {Number(tx.amount).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 lg:p-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between bg-white/20 dark:bg-black/10">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/50 dark:bg-slate-800 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all border border-black/5 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/50 dark:bg-slate-800 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all border border-black/5 shadow-sm"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        center
        showCloseIcon={false}
        styles={{
          modal: {
            borderRadius: "2rem",
            padding: "0",
            maxWidth: "28rem",
            width: "95%",
            backgroundColor: "transparent",
          },
          overlay: {
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(0,0,0,0.7)",
          },
        }}
      >
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20">
          <div className="p-6 lg:p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black tracking-tighter">
                New Entry
              </h3>
              <p className="text-blue-100 font-bold text-xs mt-0.5">
                Personal transaction
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form
            className="p-6 lg:p-8 space-y-6"
            onSubmit={handleTransactionSubmit}
          >
            <div className="flex p-1.5 bg-black/5 dark:bg-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, expenseType: "expense" })
                }
                className={`flex-1 py-3 rounded-xl font-black text-xs lg:text-sm transition-all ${formData.expenseType === "expense" ? "bg-white dark:bg-slate-800 text-rose-500 shadow-lg" : "text-slate-500"}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, expenseType: "income" })
                }
                className={`flex-1 py-3 rounded-xl font-black text-xs lg:text-sm transition-all ${formData.expenseType === "income" ? "bg-white dark:bg-slate-800 text-emerald-500 shadow-lg" : "text-slate-500"}`}
              >
                Income
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-2xl">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full pl-12 pr-6 py-5 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white text-3xl font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Grocery Shopping"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none appearance-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    required
                  >
                    <option
                      value=""
                      disabled
                      className="bg-white dark:bg-slate-900"
                    >
                      Select
                    </option>
                    {categories.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6" /> Save Transaction
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default Home;
