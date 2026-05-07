import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useProfile } from "../contexts/ProfileContext";

const FALLBACK_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

const FILTERS = [
  { label: "1 Month", months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "1 Year", months: 12 },
];

function getHeaders() {
  const token = localStorage.getItem("token");
  const profile = JSON.parse(localStorage.getItem("activeProfile") || "null");
  return {
    token,
    ...(profile?.id ? { "x-profile-id": profile.id } : {}),
  };
}

export default function Analytics() {
  const [cashFlow, setCashFlow] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMonths, setActiveMonths] = useState(1);
  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  const fetchAnalytics = useCallback(
    async (months) => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("http://localhost:3000/api/analytics", {
          headers: getHeaders(),
          params: { months },
        });
        setCashFlow(res.data.cashFlow || []);
        setCategories(res.data.categories || []);
      } catch (err) {
        if (err?.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setError("Failed to load analytics data");
        }
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (activeProfile == null) {
      toast.error("Failed To Load Profile Please Reselect Profile");
      setTimeout(() => {
        navigate("/profiles");
      }, 1000);
    }
    fetchAnalytics(activeMonths);
  }, [activeMonths, activeProfile?.id]);

  const totalIncome = cashFlow.reduce((s, r) => s + Number(r.income || 0), 0);
  const totalExpense = cashFlow.reduce((s, r) => s + Number(r.expense || 0), 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Detailed view for{" "}
            <span className="text-blue-500 font-bold">
              {activeProfile?.name || "your profile"}
            </span>
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-2xl p-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.months}
              onClick={() => setActiveMonths(f.months)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeMonths === f.months
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => fetchAnalytics(activeMonths)}
            className="ml-1 p-2 rounded-xl text-slate-500 hover:text-blue-500 hover:bg-white/50 dark:hover:bg-white/10 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Total Income
            </p>
            <p className="text-2xl font-extrabold text-emerald-500">
              ${totalIncome.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Total Expense
            </p>
            <p className="text-2xl font-extrabold text-rose-500">
              ${totalExpense.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${netBalance >= 0 ? "bg-blue-500/10" : "bg-orange-500/10"}`}
          >
            <span
              className={`text-xl font-black ${netBalance >= 0 ? "text-blue-500" : "text-orange-500"}`}
            >
              {netBalance >= 0 ? "+" : "−"}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Net Balance
            </p>
            <p
              className={`text-2xl font-extrabold ${netBalance >= 0 ? "text-blue-500" : "text-orange-500"}`}
            >
              ${Math.abs(netBalance).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center text-rose-500 font-semibold py-12">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cash Flow Chart */}
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight relative z-10">
              Cash Flow Overview
            </h2>
            <p className="text-xs text-slate-400 mb-6 relative z-10">
              Last {activeMonths} month{activeMonths > 1 ? "s" : ""}
            </p>

            {cashFlow.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">
                No transaction data for this period.
              </div>
            ) : (
              <div className="h-[320px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={cashFlow}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorIncome"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorExpense"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                      dx={-10}
                    />
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="rgba(148,163,184,0.2)"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.92)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                        color: "#f8fafc",
                        padding: "12px 16px",
                      }}
                      itemStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                      formatter={(v, n) => [
                        `$${Number(v).toFixed(2)}`,
                        n.charAt(0).toUpperCase() + n.slice(1),
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      name="income"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#ef4444"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorExpense)"
                      name="expense"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Expense by Category */}
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute right-10 top-10 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight relative z-10">
              Expenses by Category
            </h2>
            <p className="text-xs text-slate-400 mb-6 relative z-10">
              Last {activeMonths} month{activeMonths > 1 ? "s" : ""}
            </p>

            {categories.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-slate-400 dark:text-slate-500 font-medium">
                No expense category data for this period.
              </div>
            ) : (
              <div className="h-[320px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categories}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 70, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#64748b"
                      fontSize={13}
                      fontWeight="600"
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                      width={70}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.1)" }}
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.92)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                        color: "#f8fafc",
                        padding: "12px 16px",
                      }}
                      itemStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                      formatter={(v) => [`$${Number(v).toFixed(2)}`, "Amount"]}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26}>
                      {categories.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={
                            entry.color ||
                            FALLBACK_COLORS[i % FALLBACK_COLORS.length]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
