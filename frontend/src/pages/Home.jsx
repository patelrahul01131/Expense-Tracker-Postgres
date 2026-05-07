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
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";
import { Modal } from "react-responsive-modal";
import "react-responsive-modal/styles.css";
import Skeleton from "react-loading-skeleton";

function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState("expense");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { id: 1, title: "Total Income", value: 0, change: "+0.00", type: "positive", icon: ArrowUpRight },
    { id: 2, title: "Total Expense", value: 0, change: "-0.00", type: "negative", icon: ArrowDownRight },
    { id: 3, title: "Net Balance", value: 0, change: "+0.00", type: "positive", icon: DollarSign },
    { id: 4, title: "Burn Rate", value: 0, change: "+0.00", type: "positive", icon: Flame },
    { id: 5, title: "Efficiency", value: 0, change: "+0.00", type: "positive", icon: DollarSign },
    { id: 6, title: "Savings", value: 0, change: "+0.00", type: "positive", icon: Wallet },
  ]);

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [model_values, setModelValues] = useState({
    amount: "",
    category: "",
    date: "",
    title: "",
    expenseType: txType,
  });

  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  function getHeaders() {
    const token = localStorage.getItem("token");
    const profile = JSON.parse(localStorage.getItem("activeProfile") || "null");
    return { token, ...(profile?.id ? { "x-profile-id": profile.id } : {}) };
  }

  useEffect(() => {
    setModelValues((prev) => ({ ...prev, expenseType: txType }));
  }, [txType]);

  const getAllCategories = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/categories/", { headers: getHeaders() });
      setAllCategories(response.data);
    } catch (error) { return; }
  };

  const getAllExpenses = async () => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:3000/api/expense/getall", {
        params: { currentPage },
        headers: getHeaders(),
      });
      setRecentTransactions(response.data.data || []);
      setTotalExpenses(response.data.total || 0);
    } catch (error) {
      toast.error("Error Fetching Expenses");
    } finally {
      setLoading(false);
    }
  };

  const percentage_calculate = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getAllStates = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/expense/states", { headers: getHeaders() });
      const income = response.data[0].current_income || 0;
      const expense = response.data[0].current_expense || 0;
      const balance = response.data[0].current_balance || 0;
      const lastIncome = response.data[0].last_income || 0;
      const lastExpense = response.data[0].last_expense || 0;
      const lastBalance = response.data[0].last_balance || 0;
      const BurnRate = expense / 30;
      const lastBurnRate = lastExpense / 30;
      const SpendingEfficiency = expense > 0 ? (income / expense) * 100 : 0;
      const lastSpendingEfficiency = lastExpense > 0 ? (lastIncome / lastExpense) * 100 : 0;
      const SavingEfficiency = income > 0 ? ((income - expense) / income) * 100 : 0;
      const lastSavingEfficiency = lastIncome > 0 ? ((lastIncome - lastExpense) / lastIncome) * 100 : 0;

      setStats([
        { ...stats[0], value: income, change: `${percentage_calculate(income, lastIncome).toFixed(2)}%`, type: percentage_calculate(income, lastIncome) >= 0 ? "positive" : "negative" },
        { ...stats[1], value: expense, change: `${percentage_calculate(expense, lastExpense).toFixed(2)}%`, type: percentage_calculate(expense, lastExpense) <= 0 ? "positive" : "negative" },
        { ...stats[2], value: balance, change: `${percentage_calculate(balance, lastBalance).toFixed(2)}%`, type: percentage_calculate(balance, lastBalance) >= 0 ? "positive" : "negative" },
        { ...stats[3], value: BurnRate.toFixed(2), change: `${percentage_calculate(BurnRate, lastBurnRate).toFixed(2)}%`, type: percentage_calculate(BurnRate, lastBurnRate) <= 0 ? "positive" : "negative" },
        { ...stats[4], value: SpendingEfficiency.toFixed(2), change: `${percentage_calculate(SpendingEfficiency, lastSpendingEfficiency).toFixed(2)}%`, type: percentage_calculate(SpendingEfficiency, lastSpendingEfficiency) >= 0 ? "positive" : "negative" },
        { ...stats[5], value: SavingEfficiency.toFixed(2), change: `${percentage_calculate(SavingEfficiency, lastSavingEfficiency).toFixed(2)}%`, type: percentage_calculate(SavingEfficiency, lastSavingEfficiency) >= 0 ? "positive" : "negative" },
      ]);
    } catch (error) { return; }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!model_values.amount || !model_values.category || !model_values.title || !model_values.date) {
      toast.error("Please fill all the fields");
      return;
    }
    try {
      await axios.post("http://localhost:3000/api/expense/add", model_values, { headers: getHeaders() });
      toast.success("Transaction added!");
      setIsModalOpen(false);
      getAllExpenses();
      getAllStates();
      setModelValues({ amount: "", category: "", date: "", title: "", expenseType: txType });
    } catch (error) {
      toast.error("Error Adding Transaction");
    }
  };

  useEffect(() => {
    getAllExpenses();
    if (activeProfile == null) {
      toast.error("Please select a profile");
      navigate("/profiles");
    }
  }, [currentPage, activeProfile?.id]);

  useEffect(() => {
    getAllCategories();
    getAllStates();
  }, [activeProfile?.id]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(totalExpenses / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-2 lg:px-0">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-bold text-sm lg:text-base">
            Financial overview for <span className="text-blue-600">@{activeProfile?.name}</span>
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 lg:py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-blue-600/30 active:scale-95 text-sm lg:text-base"
        >
          <Plus className="w-5 h-5" />
          Add Entry
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        {stats?.map((stat) =>
          loading ? (
            <div className="glass-panel rounded-3xl p-5 lg:p-7 bg-white/40 dark:bg-slate-800/40" key={stat.id}>
              <Skeleton width="40%" height={10} />
              <Skeleton width="70%" height={30} className="mt-2" />
              <Skeleton width="50%" height={15} className="mt-4 rounded-full" />
            </div>
          ) : (
            <div
              key={stat.id}
              className="glass-panel rounded-2xl lg:rounded-3xl p-5 lg:p-7 transition-all hover:scale-[1.02] relative overflow-hidden group bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="min-w-0">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] lg:text-[10px] truncate">
                    {stat.title}
                  </p>
                  <h3 className="text-xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1.5 lg:mt-3 tracking-tighter truncate">
                    {stat.value}
                  </h3>
                </div>
                <div className={`p-2.5 lg:p-4 rounded-xl lg:rounded-2xl backdrop-blur-sm flex-shrink-0 ${stat.type === "positive" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                  <stat.icon className="w-5 h-5 lg:w-7 lg:h-7" />
                </div>
              </div>
              <div className="mt-4 lg:mt-6 flex items-center gap-2 relative z-10">
                <span className={`text-[10px] lg:text-xs font-black px-2 py-0.5 rounded-lg ${stat.type === "positive" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                  {stat.change}
                </span>
                <span className="text-[9px] lg:text-[10px] text-slate-400 font-black uppercase tracking-tighter">vs last</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* Transactions Section */}
      <div className="glass-panel rounded-3xl lg:rounded-[2.5rem] overflow-hidden bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5 shadow-2xl">
        <div className="p-6 lg:p-8 border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/10">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
            Activity Feed
          </h2>
        </div>
        
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-5 lg:p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton width={50} height={50} className="rounded-xl" />
                  <div className="space-y-1">
                    <Skeleton width={120} height={18} />
                    <Skeleton width={80} height={12} />
                  </div>
                </div>
                <Skeleton width={60} height={20} />
              </div>
            ))
          ) : recentTransactions.length === 0 ? (
            <div className="py-20 text-center opacity-30">
               <Wallet className="w-16 h-16 mx-auto mb-4" />
               <p className="font-black text-xl">No entries found</p>
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <div key={tx.id} className="p-4 lg:p-6 flex items-center justify-between hover:bg-white/50 dark:hover:bg-white/5 transition-all group">
                <div className="flex items-center gap-3 lg:gap-5 min-w-0">
                  <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${tx.expense_type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                    {tx.expense_type === "income" ? <ArrowUpRight className="w-5 h-5 lg:w-7 lg:h-7" /> : <ArrowDownRight className="w-5 h-5 lg:w-7 lg:h-7" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm lg:text-lg text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                      {tx.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 truncate">
                      <span className="text-[8px] lg:text-[10px] font-black px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-widest" style={{ borderLeft: `3px solid ${tx.category_color}` }}>
                        {tx.category_name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(tx.expense_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:gap-6 flex-shrink-0">
                  <span className={`font-black text-base lg:text-xl ${tx.expense_type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                    {tx.expense_type === 'income' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 lg:p-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between bg-white/20 dark:bg-black/10">
          <button
            onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/50 dark:bg-slate-800 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all border border-black/5 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/50 dark:bg-slate-800 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all border border-black/5 shadow-sm"
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
        styles={{
          modal: { borderRadius: "2rem", padding: "0", maxWidth: "28rem", width: "95%", backgroundColor: 'transparent' },
          overlay: { backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.7)' }
        }}
        showCloseIcon={false}
      >
        <div className="glass-panel bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20">
          <div className="p-6 lg:p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black tracking-tighter">New Entry</h3>
              <p className="text-blue-100 font-bold text-xs mt-0.5">Personal transaction</p>
            </div>
            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form className="p-6 lg:p-8 space-y-6" onSubmit={handleTransaction}>
            <div className="flex p-1.5 bg-black/5 dark:bg-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setTxType("expense")}
                className={`flex-1 py-3 rounded-xl font-black text-xs lg:text-sm transition-all ${txType === "expense" ? "bg-white dark:bg-slate-800 text-rose-500 shadow-lg" : "text-slate-500"}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setTxType("income")}
                className={`flex-1 py-3 rounded-xl font-black text-xs lg:text-sm transition-all ${txType === "income" ? "bg-white dark:bg-slate-800 text-emerald-500 shadow-lg" : "text-slate-500"}`}
              >
                Income
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-2xl">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={model_values.amount}
                    onChange={(e) => setModelValues({ ...model_values, amount: e.target.value })}
                    className="w-full pl-12 pr-6 py-5 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white text-3xl font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Title</label>
                <input
                  type="text"
                  value={model_values.title}
                  onChange={(e) => setModelValues({ ...model_values, title: e.target.value })}
                  placeholder="e.g. Grocery Shopping"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Date</label>
                  <input
                    type="date"
                    value={model_values.date}
                    onChange={(e) => setModelValues({ ...model_values, date: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Category</label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none appearance-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    value={model_values.category}
                    onChange={(e) => setModelValues({ ...model_values, category: e.target.value })}
                    required
                  >
                    <option value="" disabled>Select</option>
                    {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3">
              <Plus className="w-6 h-6" /> Save Transaction
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default Home;
