import React, { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Shield, ArrowRight, Loader2, X, Mail, Trash2, UserPlus, Crown
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useProfile } from "../contexts/ProfileContext";

const GRADIENT_COLORS = [
  "from-blue-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-purple-500 to-violet-500",
];

function getHeaders() {
  const token = localStorage.getItem("token");
  const profile = JSON.parse(localStorage.getItem("activeProfile") || "null");
  return { token, ...(profile?.id ? { "x-profile-id": profile.id } : {}) };
}

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();
  const { activeProfile } = useProfile();

  const fetchGroups = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");
    if (activeProfile == null) return;
    
    try {
      const res = await axios.get("http://localhost:3000/api/groups", { headers: getHeaders() });
      setGroups(res.data || []);
    } catch (err) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id, navigate]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Group name is required");
    setCreating(true);
    try {
      await axios.post("http://localhost:3000/api/groups", formData, { headers: getHeaders() });
      toast.success("Group created! 🚀");
      setShowCreate(false);
      setFormData({ name: "", description: "" });
      fetchGroups();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const getInitials = (name = "") =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "G";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-2 lg:px-0 text-slate-900 dark:text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
            My Groups
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-bold text-sm lg:text-base">
            Managing expenses for <span className="text-blue-500">@{activeProfile?.name}</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 lg:py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-blue-600/30 active:scale-95 text-sm lg:text-base"
        >
          <Plus className="w-5 h-5" /> Start New Group
        </button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 lg:py-32 text-center glass-panel rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40 border border-white/20">
          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 mb-6">
            <Users className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No groups yet</h3>
          <p className="text-slate-500 font-bold max-w-sm mb-8">Connect with friends and family to split bills effortlessly.</p>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-600/30">
            Create First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {groups.map((group, index) => (
            <div
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="glass-panel p-6 lg:p-8 rounded-3xl hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden group bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/5 shadow-xl hover:shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-[1.25rem] lg:rounded-[1.5rem] bg-gradient-to-tr ${GRADIENT_COLORS[index % GRADIENT_COLORS.length]} flex items-center justify-center text-white font-black text-xl lg:text-2xl shadow-xl border-2 border-white/20`}>
                  {group.avatar_url ? (
                    <img src={group.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(group.name)
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-3 py-1 bg-white/60 dark:bg-black/20 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {group.member_count} Members
                  </span>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${group.role === 'admin' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    {group.role === 'admin' ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {group.role}
                  </div>
                </div>
              </div>
              <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mb-2 truncate">
                {group.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-8 line-clamp-2 min-h-[40px]">
                {group.description || "Track expenses with your group members."}
              </p>
              <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-5">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                  View activity <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 lg:p-4 bg-black/70 backdrop-blur-md" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-8 lg:p-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tighter">New Group</h2>
                <p className="text-blue-100 font-bold text-xs mt-1">Start tracking shared expenses</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X className="w-7 h-7" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 lg:p-10 space-y-6 lg:space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Group Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Dream House"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What is this group for?"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-none"
                />
              </div>
              <button type="submit" disabled={creating} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3">
                {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6" /> Create Group</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
