import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users, Plus, ArrowLeft, Loader2, Calendar, DollarSign,
  TrendingUp, TrendingDown, Trash2, Mail, UserPlus, Crown, Shield, X, Save, Edit3, MessageSquare, Info, Tag, Check, ChevronDown, ChevronUp, AlertCircle, PieChart, Activity, Wallet, History, Settings, Bell, Clock, ArrowUpRight, ArrowDownLeft, Send
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { useProfile } from "../contexts/ProfileContext";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

function getHeaders() {
  const token = localStorage.getItem("token");
  const profile = JSON.parse(localStorage.getItem("activeProfile") || "null");
  return { token, ...(profile?.id ? { "x-profile-id": profile.id } : {}) };
}

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [balances, setBalances] = useState({ debts: [], settlements: [] });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses"); // expenses, balances, history, analytics

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    expense_type: "expense",
    expense_date: new Date().toISOString().split("T")[0],
    category_id: null,
    notes: "",
    split_type: "equal",
    splits: []
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, expRes, memRes, catRes, balRes, notifRes] = await Promise.all([
        axios.get("http://localhost:3000/api/groups", { headers: getHeaders() }),
        axios.get(`http://localhost:3000/api/groups/${groupId}/expenses`, { headers: getHeaders() }),
        axios.get(`http://localhost:3000/api/groups/${groupId}/members`, { headers: getHeaders() }),
        axios.get("http://localhost:3000/api/categories", { headers: getHeaders() }),
        axios.get(`http://localhost:3000/api/groups/${groupId}/balances`, { headers: getHeaders() }),
        axios.get(`http://localhost:3000/api/groups/notifications`, { headers: getHeaders() })
      ]);

      const currentGroup = groupsRes.data.find(g => g.id === groupId);
      if (!currentGroup) {
        toast.error("Group not found");
        navigate("/groups");
        return;
      }
      setGroup(currentGroup);
      setExpenses(expRes.data || []);
      setMembers(memRes.data || []);
      setCategories(catRes.data || []);
      setBalances(balRes.data || { debts: [], settlements: [] });
      setNotifications(notifRes.data.filter(n => n.group_id === groupId) || []);

      setExpenseForm(prev => ({
        ...prev,
        splits: memRes.data.map(m => ({ profile_id: m.profile_id, amount: 0, percent: 0, selected: true }))
      }));
    } catch (err) {
      toast.error("Error loading group details");
    } finally {
      setLoading(false);
    }
  }, [groupId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!expenseForm.amount || isNaN(expenseForm.amount)) return;
    const total = parseFloat(expenseForm.amount);
    const selectedMembers = expenseForm.splits.filter(s => s.selected);
    if (selectedMembers.length === 0) return;

    let newSplits = [...expenseForm.splits];
    if (expenseForm.split_type === "equal") {
      const splitAmount = (total / selectedMembers.length).toFixed(2);
      newSplits = newSplits.map(s => s.selected ? { ...s, amount: splitAmount, percent: (100 / selectedMembers.length).toFixed(2) } : { ...s, amount: 0, percent: 0 });
    }
    setExpenseForm(prev => ({ ...prev, splits: newSplits }));
  }, [expenseForm.amount, expenseForm.split_type, expenseForm.splits.filter(s => s.selected).length]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const selectedSplits = expenseForm.splits.filter(s => s.selected).map(s => ({
      profile_id: s.profile_id,
      amount: s.amount,
      percent: s.percent
    }));
    if (selectedSplits.length === 0) return toast.error("Select members");

    setAddingExpense(true);
    try {
      await axios.post(`http://localhost:3000/api/groups/${groupId}/expenses`, { ...expenseForm, splits: selectedSplits }, { headers: getHeaders() });
      toast.success("Expense recorded!");
      setShowAddExpense(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to add");
    } finally {
      setAddingExpense(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await axios.post(`http://localhost:3000/api/groups/${groupId}/invite`, { email: inviteEmail }, { headers: getHeaders() });
      toast.success("Invitation sent successfully!");
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const handleSettle = async (from, to, amount, splitId = null) => {
    try {
      await axios.post(`http://localhost:3000/api/groups/${groupId}/settle`, {
        from_profile_id: from,
        to_profile_id: to,
        amount: amount,
        split_id: splitId
      }, { headers: getHeaders() });
      toast.success("Settlement request sent!");
      fetchData();
    } catch (err) {
      toast.error("Failed to request settlement");
    }
  };

  const handleConfirmNotif = async (notif, status) => {
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.id !== notif.id));

    try {
      const settlementId = notif.data.settlement_id;
      await axios.post(`http://localhost:3000/api/groups/settlements/${settlementId}/confirm`, { status }, { headers: getHeaders() });
      toast.success(`Payment ${status}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error confirming payment");
      fetchData(); // Restore state
    }
  };

  const totalSpent = expenses.reduce((acc, exp) => acc + (exp.expense_type === 'expense' ? Number(exp.total_amount) : 0), 0);
  const totalIncome = expenses.reduce((acc, exp) => acc + (exp.expense_type === 'income' ? Number(exp.total_amount) : 0), 0);

  const memberBalances = useMemo(() => {
    if (!activeProfile || !members.length) return [];
    const net = {};
    members.forEach(m => {
      if (m.profile_id !== activeProfile.id) {
        net[m.profile_id] = { name: m.full_name, balance: 0 };
      }
    });
    balances.debts.forEach(d => {
      if (d.owes_profile_id === activeProfile.id && d.paid_by_profile_id !== activeProfile.id) {
        if (net[d.paid_by_profile_id]) net[d.paid_by_profile_id].balance -= Number(d.amount);
      }
      if (d.paid_by_profile_id === activeProfile.id && d.owes_profile_id !== activeProfile.id) {
        if (net[d.owes_profile_id]) net[d.owes_profile_id].balance += Number(d.amount);
      }
    });
    return Object.values(net);
  }, [balances.debts, activeProfile, members]);

  const categoryData = useMemo(() => {
    const counts = {};
    expenses.forEach(exp => {
      if (exp.expense_type === 'expense' && exp.category_name) {
        counts[exp.category_name] = (counts[exp.category_name] || 0) + Number(exp.total_amount);
      }
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [expenses]);

  const memberData = useMemo(() => {
    const spends = {};
    expenses.forEach(exp => {
      if (exp.expense_type === 'expense') {
        spends[exp.added_by_name] = (spends[exp.added_by_name] || 0) + Number(exp.total_amount);
      }
    });
    return Object.keys(spends).map(key => ({ name: key, spent: spends[key] }));
  }, [expenses]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-2 lg:px-0 text-slate-900 dark:text-white">
      
      {/* Group Page Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} className="bg-amber-500/10 border-2 border-amber-500/20 p-4 lg:p-5 rounded-2xl lg:rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    <span className="font-black">{n.sender_name}</span> is settling <span className="font-black text-amber-600">${n.data.amount}</span> with you.
                  </p>
                  <p className="text-[10px] font-black uppercase text-amber-600/60 mt-0.5">Please confirm if received</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={() => handleConfirmNotif(n, 'accepted')} className="flex-1 sm:flex-none px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-95">Confirm</button>
                <button onClick={() => handleConfirmNotif(n, 'rejected')} className="flex-1 sm:flex-none px-6 py-2.5 bg-white/80 dark:bg-slate-800 text-amber-700 dark:text-amber-300 text-xs font-black rounded-xl border border-amber-200">Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hero Header */}
      <div className="glass-panel p-6 lg:p-10 rounded-3xl lg:rounded-[3.5rem] bg-white/40 dark:bg-slate-800/40 border border-white/20 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10 relative z-10">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[1.5rem] lg:rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-4xl lg:text-6xl shadow-2xl overflow-hidden shadow-blue-500/20 border-4 border-white/20">
              {group?.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" /> : group?.name?.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-xl">
              <Users className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500" />
            </div>
          </div>
          
          <div className="flex-1 text-center lg:text-left w-full min-w-0">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 lg:gap-4 mb-2 lg:mb-3">
              <h1 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter truncate max-w-full">{group?.name}</h1>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-[9px] lg:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">{group?.role}</span>
                {group?.role === 'admin' && (
                  <button onClick={() => setShowInviteModal(true)} className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl hover:bg-indigo-500/20 transition-all flex items-center gap-2 text-[9px] lg:text-[10px] font-black uppercase">
                    <UserPlus className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Invite
                  </button>
                )}
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm lg:text-xl max-w-xl mx-auto lg:mx-0">{group?.description || "Collaborative financial tracking"}</p>
          </div>

          <div className="flex flex-col gap-4 w-full lg:w-72 flex-shrink-0">
            <div className="bg-black/5 dark:bg-white/5 p-5 lg:p-6 rounded-3xl border border-black/5 dark:border-white/5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Group Cashflow</h3>
              <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {memberBalances.map((mb, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{mb.name}</span>
                    <span className={`text-sm font-black whitespace-nowrap ${mb.balance > 0 ? 'text-emerald-500' : mb.balance < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {mb.balance > 0 ? '+' : ''}{mb.balance.toFixed(2)}
                    </span>
                  </div>
                ))}
                {memberBalances.length === 0 && <p className="text-[10px] text-slate-400 font-bold italic">No other members</p>}
              </div>
            </div>
            <button onClick={() => setShowAddExpense(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 lg:py-5 rounded-2xl lg:rounded-[1.5rem] font-black shadow-2xl shadow-blue-600/40 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5 lg:w-6 lg:h-6" /> Record Entry
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-nowrap lg:flex-wrap gap-1 lg:gap-2 p-1 lg:p-2 bg-black/5 dark:bg-white/5 rounded-2xl lg:rounded-[2.5rem] w-full lg:w-fit overflow-x-auto no-scrollbar lg:mx-0 shadow-inner">
        {[
          { id: 'expenses', label: 'Activity', icon: MessageSquare },
          { id: 'balances', label: 'Debts', icon: Wallet },
          { id: 'history', label: 'Settlements', icon: History },
          { id: 'analytics', label: 'Insights', icon: PieChart }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 lg:gap-3 px-4 lg:px-8 py-3 lg:py-4 rounded-xl lg:rounded-[2rem] text-xs lg:text-sm font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
            <tab.icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      {activeTab === 'expenses' && (
        <div className="space-y-4 lg:space-y-6 max-w-5xl mx-auto pb-10">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 lg:py-32 opacity-40">
              <MessageSquare className="w-16 h-16 lg:w-20 lg:h-20 mb-4" />
              <p className="text-xl lg:text-2xl font-black">No transactions yet</p>
            </div>
          ) : (
            expenses.map((exp) => {
              const isMe = exp.added_by_name === activeProfile?.name || exp.added_by_profile === activeProfile?.name;
              return (
                <div key={exp.id} className={`flex gap-2 lg:gap-4 w-full animate-in slide-in-from-bottom-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="flex-shrink-0 mt-auto mb-1">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-[10px] font-black shadow-lg overflow-hidden">
                      {exp.added_by_avatar ? <img src={exp.added_by_avatar} className="w-full h-full object-cover" /> : exp.added_by_name.charAt(0)}
                    </div>
                  </div>
                  <div className={`flex flex-col gap-1 lg:gap-1.5 max-w-[85%] lg:max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 lg:gap-3 px-2 lg:px-3">
                      <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-tighter">{exp.added_by_name}</span>
                      <span className="text-[9px] text-slate-300 font-bold">{new Date(exp.expense_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div onClick={() => setSelectedExpense(exp)} className={`group cursor-pointer p-4 lg:p-6 rounded-2xl lg:rounded-[2.5rem] shadow-xl transition-all hover:scale-[1.01] active:scale-98 relative overflow-hidden ${isMe ? 'bg-blue-600 text-white rounded-tr-lg' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-lg border border-black/5 dark:border-white/5'}`}>
                      <div className="flex items-center justify-between gap-6 lg:gap-10 mb-3 lg:mb-4">
                        <h4 className="text-base lg:text-xl font-black leading-tight tracking-tight">{exp.title}</h4>
                        <div className={`text-xl lg:text-3xl font-black ${isMe ? 'text-white' : (exp.expense_type === 'income' ? 'text-emerald-500' : 'text-rose-500')}`}>
                          ${Number(exp.total_amount).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                        {exp.category_name && (
                          <div className={`flex items-center gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest ${isMe ? 'bg-white/20' : 'bg-black/5'}`}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: exp.category_color }} />
                            {exp.category_name}
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest ${isMe ? 'bg-white/20' : 'bg-black/5'}`}>
                           <Users className="w-3 h-3" /> {exp.splits?.length} Shared
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Debt Tracker */}
      {activeTab === 'balances' && (
        <div className="max-w-4xl mx-auto space-y-4 lg:space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl lg:text-2xl font-black flex items-center gap-2 lg:gap-4 text-rose-500 uppercase tracking-tighter"><ArrowDownLeft className="w-6 h-6 lg:w-8 lg:h-8" /> Pending Shares</h3>
            <div className="px-3 py-1 bg-rose-500/10 text-rose-500 text-[9px] lg:text-[10px] font-black rounded-lg uppercase tracking-widest">{balances.debts.length} Pending</div>
          </div>
          <div className="space-y-3 lg:space-y-4">
            {balances.debts.length === 0 ? (
              <div className="p-10 lg:p-20 glass-panel rounded-2xl lg:rounded-[3rem] text-center border-2 border-dashed border-emerald-500/20">
                <Check className="w-12 h-12 lg:w-16 lg:h-16 text-emerald-500 mx-auto mb-4 opacity-50" />
                <p className="text-xl lg:text-2xl font-black text-slate-400">All settled up! 🏆</p>
              </div>
            ) : (
              balances.debts.map((d, i) => {
                const isIOWE = d.owes_profile_id === activeProfile?.id;
                const isOWESME = d.paid_by_profile_id === activeProfile?.id;
                
                return (
                  <div key={i} className="glass-panel p-5 lg:p-8 rounded-2xl lg:rounded-[2.5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-black/5 hover:border-blue-500/30 transition-all group shadow-lg">
                    <div className="flex items-center gap-4 lg:gap-5">
                      <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-lg lg:text-xl shadow-lg flex-shrink-0 ${isIOWE ? 'from-rose-500/20 to-rose-600/20 text-rose-600' : 'from-emerald-500/20 to-emerald-600/20 text-emerald-600'} bg-gradient-to-tr`}>
                        {isIOWE ? d.paid_by_full_name.charAt(0) : d.owes_full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm lg:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          {isIOWE ? (
                            <>You owe <span className="font-black text-rose-500">{d.paid_by_full_name}</span></>
                          ) : isOWESME ? (
                            <><span className="font-black text-emerald-500">{d.owes_full_name}</span> owes you</>
                          ) : (
                            <><span className="font-black">{d.owes_full_name}</span> owes <span className="font-black">{d.paid_by_full_name}</span></>
                          )}
                        </p>
                        <p className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1">${Number(d.amount).toFixed(2)}</p>
                      </div>
                    </div>
                    {isIOWE && (
                      <button onClick={() => handleSettle(d.owes_profile_id, d.paid_by_profile_id, d.amount, d.split_id)} className="w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl lg:rounded-2xl shadow-2xl shadow-blue-600/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 text-xs lg:text-sm">
                        <Send className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Settle Share
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="max-w-4xl mx-auto space-y-4 lg:space-y-8">
          <h3 className="text-xl lg:text-2xl font-black flex items-center gap-2 lg:gap-4 text-emerald-500 uppercase tracking-tighter px-2"><History className="w-6 h-6 lg:w-8 lg:h-8" /> Settlement Logs</h3>
          <div className="space-y-3 lg:space-y-4">
            {balances.settlements.length === 0 ? (
               <div className="p-10 lg:p-20 glass-panel rounded-2xl lg:rounded-[3rem] text-center opacity-40">
                 <Clock className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4" />
                 <p className="text-lg lg:text-xl font-bold">No history recorded</p>
               </div>
            ) : (
              balances.settlements.map((s, i) => (
                <div key={i} onClick={() => setSelectedSettlement(s)} className={`glass-panel p-4 lg:p-6 rounded-2xl lg:rounded-[2rem] flex items-center justify-between border-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-98 ${s.confirmed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5 shadow-lg shadow-amber-500/5'}`}>
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 ${s.confirmed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                      {s.confirmed ? <Check className="w-5 h-5 lg:w-6 lg:h-6" /> : <Clock className="w-5 h-5 lg:w-6 lg:h-6" />}
                    </div>
                    <div>
                      <p className="font-black text-base lg:text-lg text-slate-900 dark:text-white">${Number(s.amount).toFixed(2)}</p>
                      <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{s.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] lg:text-xs font-bold text-slate-400">{s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}</p>
                     <p className="text-[8px] lg:text-[10px] font-black text-blue-500 mt-1 uppercase">Ref: {s.id?.slice(0,8) || '####'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Insights */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10">
          <div className="glass-panel p-6 lg:p-10 rounded-2xl lg:rounded-[3.5rem] border-2 border-black/5 shadow-2xl bg-white/60 dark:bg-slate-800/60 text-center">
            <h3 className="text-lg lg:text-2xl font-black mb-6 lg:mb-10">Spending by Category</h3>
            <div className="h-[300px] lg:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={window.innerWidth < 640 ? 60 : 80} outerRadius={window.innerWidth < 640 ? 90 : 120} paddingAngle={8} dataKey="value" stroke="none">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: 'bold' }} />
                  <Legend iconType="circle" />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-panel p-6 lg:p-10 rounded-2xl lg:rounded-[3.5rem] border-2 border-black/5 shadow-2xl bg-white/60 dark:bg-slate-800/60 text-center">
            <h3 className="text-lg lg:text-2xl font-black mb-6 lg:mb-10">Top Spenders</h3>
            <div className="h-[300px] lg:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 'bold' }} />
                  <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: 'bold' }} />
                  <Bar dataKey="spent" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={window.innerWidth < 640 ? 25 : 40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Split Details */}
      {selectedExpense && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 lg:p-4 bg-black/80 backdrop-blur-2xl" onClick={() => setSelectedExpense(null)}>
           <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] lg:rounded-[4rem] p-6 lg:p-12 space-y-6 lg:space-y-10 relative shadow-2xl border border-white/10 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedExpense(null)} className="absolute right-6 top-6 lg:right-10 lg:top-10 p-2 lg:p-3 bg-black/5 hover:bg-rose-500/10 rounded-xl lg:rounded-2xl transition-all"><X className="w-5 h-5 lg:w-6 lg:h-6" /></button>
              <div className="text-center space-y-3 lg:space-y-4">
                <div className="w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl lg:rounded-[2.5rem] mx-auto flex items-center justify-center text-white font-black text-2xl lg:text-4xl shadow-2xl border-4 border-white/20">{selectedExpense.added_by_name.charAt(0)}</div>
                <h2 className="text-2xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">{selectedExpense.title}</h2>
                <p className="text-sm lg:text-lg text-slate-500 font-bold">Paid by <span className="text-blue-600">{selectedExpense.added_by_name}</span></p>
              </div>
              <div className="bg-blue-600/5 dark:bg-blue-500/10 p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border-2 border-blue-500/10 text-center">
                <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 lg:mb-3">Total Amount</p>
                <p className="text-4xl lg:text-6xl font-black text-blue-600 tracking-tighter">${Number(selectedExpense.total_amount).toFixed(2)}</p>
              </div>
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-center justify-between px-2 lg:px-4">
                   <h4 className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">Share Breakdown</h4>
                   <span className="text-[8px] lg:text-[10px] font-black text-blue-500 uppercase bg-blue-500/10 px-2 lg:px-3 py-1 rounded-full">{selectedExpense.split_type}</span>
                </div>
                <div className="space-y-3 lg:space-y-4">
                  {selectedExpense.splits?.map((s, i) => {
                    const isPending = s.status === 'pending' || s.status === null;
                    const canSettle = s.profile_id === activeProfile?.id && isPending && selectedExpense.paid_by_profile_id !== activeProfile?.id;
                    return (
                      <div key={i} className={`flex items-center justify-between p-4 lg:p-5 rounded-xl lg:rounded-[2rem] border-2 transition-all ${!isPending ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 'bg-white dark:bg-slate-800 border-black/5 shadow-lg'}`}>
                         <div className="flex items-center gap-3 lg:gap-4">
                           <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center font-black text-xs lg:text-sm ${!isPending ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>
                              {!isPending ? <Check className="w-4 h-4 lg:w-5 lg:h-5" /> : s.full_name.charAt(0)}
                           </div>
                           <div>
                             <p className="text-xs lg:text-sm font-black text-slate-800 dark:text-slate-200">{s.profile_id === activeProfile?.id ? 'You' : s.full_name}</p>
                             <p className={`text-[8px] lg:text-[10px] font-black uppercase ${!isPending ? 'text-emerald-500' : 'text-slate-400'}`}>{!isPending ? 'Completed' : 'Pending Share'}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3 lg:gap-4">
                           <span className="text-lg lg:text-xl font-black text-slate-900 dark:text-white">${Number(s.amount).toFixed(2)}</span>
                           {canSettle && (
                             <button onClick={(e) => { e.stopPropagation(); handleSettle(s.profile_id, selectedExpense.paid_by_profile_id, s.amount, s.id); }} className="p-2 lg:p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg lg:rounded-xl shadow-lg active:scale-95 transition-all"><Send className="w-3.5 h-3.5 lg:w-4 lg:h-4" /></button>
                           )}
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Settlement Details */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 lg:p-4 bg-black/80 backdrop-blur-2xl" onClick={() => setSelectedSettlement(null)}>
           <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 space-y-6 lg:space-y-8 relative shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedSettlement(null)} className="absolute right-6 top-6 lg:right-8 lg:top-8 p-2 bg-black/5 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              <div className="text-center space-y-3 lg:space-y-4">
                <div className={`w-16 h-16 lg:w-20 lg:h-20 mx-auto rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-2xl ${selectedSettlement.confirmed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                   {selectedSettlement.confirmed ? <Check className="w-8 h-8 lg:w-10 lg:h-10" /> : <Clock className="w-8 h-8 lg:w-10 lg:h-10" />}
                </div>
                <h3 className="text-2xl lg:text-3xl font-black">Settlement Info</h3>
                <div className="px-3 lg:px-4 py-1 lg:py-1.5 rounded-full bg-black/5 dark:bg-white/5 w-fit mx-auto text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Ref: {selectedSettlement.id}
                </div>
              </div>

              <div className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between p-4 lg:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl lg:rounded-3xl">
                   <div>
                     <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase mb-1">From</p>
                     <p className="font-black text-base lg:text-lg">{selectedSettlement.from_name}</p>
                   </div>
                   <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5 text-slate-300" />
                   <div className="text-right">
                     <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase mb-1">To</p>
                     <p className="font-black text-base lg:text-lg">{selectedSettlement.to_name}</p>
                   </div>
                </div>

                <div className="p-6 lg:p-8 bg-blue-600/5 rounded-2xl lg:rounded-3xl border-2 border-blue-500/10 text-center">
                  <p className="text-[8px] lg:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 lg:mb-2">Amount Transferred</p>
                  <p className="text-3xl lg:text-5xl font-black text-blue-600">${Number(selectedSettlement.amount).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-1.5 lg:gap-2">
                   <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-400" />
                   <span className="text-[10px] lg:text-xs font-bold text-slate-500">{new Date(selectedSettlement.created_at).toLocaleString()}</span>
                </div>
                <span className={`text-[8px] lg:text-[10px] font-black uppercase px-2 lg:px-3 py-1 rounded-lg ${selectedSettlement.confirmed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {selectedSettlement.status}
                </span>
              </div>
           </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 lg:p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowInviteModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 lg:p-10 space-y-6 lg:space-y-8 relative" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-3 lg:space-y-4">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-indigo-500/10 rounded-2xl lg:rounded-3xl mx-auto flex items-center justify-center text-indigo-500">
                <UserPlus className="w-8 h-8 lg:w-10 lg:h-10" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tight">Invite Member</h2>
              <p className="text-sm lg:text-base text-slate-500 font-bold">Grow your group and share expenses together.</p>
            </div>
            <form onSubmit={handleInvite} className="space-y-6">
              <div className="space-y-2 lg:space-y-3">
                <label className="block text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input required type="email" placeholder="friend@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full pl-12 pr-6 py-4 lg:py-5 bg-slate-50 dark:bg-slate-800 rounded-xl lg:rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all shadow-inner text-sm lg:text-base" />
                </div>
              </div>
              <button type="submit" disabled={inviting} className="w-full py-4 lg:py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl lg:rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-sm lg:text-base">
                {inviting ? <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" /> : <><Send className="w-4 h-4 lg:w-5 lg:h-5" /> Send Invitation</>}
              </button>
            </form>
            <button onClick={() => setShowInviteModal(false)} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 lg:p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowAddExpense(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 lg:p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl lg:text-3xl font-black tracking-tight">Record Entry</h2>
                <p className="text-blue-100 font-bold text-[10px] lg:text-xs mt-1">Shared group transaction</p>
              </div>
              <button onClick={() => setShowAddExpense(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="w-6 h-6 lg:w-7 lg:h-7" /></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 lg:p-10 space-y-6 lg:space-y-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-3 lg:space-y-4">
                <label className="block text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">What was this for?</label>
                <input required placeholder="e.g. Dinner" value={expenseForm.title} onChange={e => setExpenseForm({...expenseForm, title: e.target.value})} className="w-full p-4 lg:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl lg:rounded-3xl font-black text-lg lg:text-xl outline-none border-2 border-transparent focus:border-blue-500 shadow-inner" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-3 lg:space-y-4">
                  <label className="block text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-6 lg:h-6 text-slate-400" />
                    <input required type="number" step="0.01" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full pl-12 pr-6 py-4 lg:py-6 bg-slate-50 dark:bg-slate-800 rounded-2xl lg:rounded-3xl font-black text-xl lg:text-2xl outline-none shadow-inner" />
                  </div>
                </div>
                <div className="space-y-3 lg:space-y-4">
                  <label className="block text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select value={expenseForm.category_id || ""} onChange={e => setExpenseForm({...expenseForm, category_id: e.target.value})} className="w-full p-4 lg:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl lg:rounded-3xl font-black outline-none appearance-none shadow-inner text-sm lg:text-base text-slate-900 dark:text-white">
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Miscellaneous</option>
                    {categories.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-4 lg:space-y-6 bg-blue-500/5 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border-2 border-blue-500/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Split with</h4>
                  <span className="text-[8px] lg:text-[10px] font-black text-blue-500 bg-white dark:bg-slate-900 px-2 lg:px-3 py-1 rounded-full shadow-sm">{expenseForm.splits.filter(s => s.selected).length} Members</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
                  {expenseForm.splits.map((s, idx) => (
                    <button type="button" key={s.profile_id} onClick={() => {
                      const ns = [...expenseForm.splits]; ns[idx].selected = !ns[idx].selected; setExpenseForm({...expenseForm, splits: ns});
                    }} className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl border-2 transition-all font-black text-[10px] lg:text-xs flex items-center justify-between ${s.selected ? 'border-blue-500 bg-white shadow-lg text-blue-600' : 'border-slate-100 opacity-40 bg-slate-50'}`}>
                      <span className="truncate mr-2">{members.find(m => m.profile_id === s.profile_id)?.full_name}</span>
                      {s.selected && <Check className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={addingExpense} className="w-full py-5 lg:py-7 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl lg:rounded-[2rem] text-lg lg:text-xl shadow-2xl shadow-blue-600/40 transition-all hover:-translate-y-1 flex items-center justify-center gap-3">
                {addingExpense ? <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 animate-spin" /> : <><Save className="w-5 h-5 lg:w-6 lg:h-6" /> Save Transaction</>}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
