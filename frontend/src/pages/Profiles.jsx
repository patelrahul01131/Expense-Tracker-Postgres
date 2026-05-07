import React, { useEffect, useState } from "react";
import { Users, Plus, ArrowRight, Loader2, UserCircle2, X, User, Save, CheckCircle2, RefreshCw, Calendar } from "lucide-react";
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

export default function Profiles() {
  const { profiles, activeProfile, switchProfile, fetchProfiles, loadingProfiles } = useProfile();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailProfile, setDetailProfile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", currency: "USD", avatar_url: "" });
  const navigate = useNavigate();

  const getInitials = (name = "") =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error("Profile name is required"); return; }
    const token = localStorage.getItem("token");
    setCreating(true);
    try {
      await axios.post(
        "http://localhost:3000/api/profile",
        { name: formData.name.trim(), currency: formData.currency, avatar_url: formData.avatar_url || null },
        { headers: { token } }
      );
      toast.success("Profile created successfully! 🎉");
      setCreateOpen(false);
      setFormData({ name: "", currency: "USD", avatar_url: "" });
      await fetchProfiles();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create profile");
    } finally {
      setCreating(false);
    }
  };

  const handleSwitch = (profile) => {
    switchProfile(profile);
    setDetailProfile(null);
    toast.success(`Switched to "${profile.name}"`);
  };

  if (loadingProfiles) return <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-2 lg:px-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">My Profiles</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-bold text-sm lg:text-base">
            {profiles.length} total · Active: <span className="text-blue-500 font-black">{activeProfile?.name || "—"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={fetchProfiles} className="flex-1 sm:flex-none p-4 lg:p-3.5 rounded-2xl text-slate-500 hover:text-blue-500 bg-white/40 dark:bg-slate-800/40 border border-white/20 transition-all shadow-lg flex items-center justify-center" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setFormData({ name: "", currency: "USD", avatar_url: "" }); setCreateOpen(true); }}
            className="flex-[4] sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 lg:py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-blue-600/30 active:scale-95 text-sm lg:text-base"
          >
            <Plus className="w-5 h-5" /> New Profile
          </button>
        </div>
      </div>

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center glass-panel rounded-[2.5rem] bg-white/40 dark:bg-slate-800/40 border border-white/20">
          <UserCircle2 className="w-20 h-20 text-blue-500/10 mb-6" />
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No profiles found</h3>
          <p className="text-slate-500 font-bold max-w-sm mb-8">Profiles help you separate personal, business, and shared expenses.</p>
          <button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-600/30">
            Create First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mt-8">
          {profiles.map((profile, index) => {
            const isActive = activeProfile?.id === profile.id;
            return (
              <div
                key={profile.id}
                onClick={() => setDetailProfile({ ...profile, colorIndex: index })}
                className={`glass-panel p-6 lg:p-8 rounded-3xl hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden group border-2 ${
                  isActive
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-900/10 shadow-2xl shadow-blue-500/10"
                    : "border-white/20 dark:border-white/5 bg-white/40 dark:bg-slate-800/40 hover:border-blue-500/30 shadow-xl"
                }`}
              >
                {isActive && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                    <CheckCircle2 className="w-3 h-3" /> Selected
                  </div>
                )}
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-[1.25rem] lg:rounded-[1.5rem] bg-gradient-to-tr ${GRADIENT_COLORS[index % GRADIENT_COLORS.length]} flex items-center justify-center text-white font-black text-xl lg:text-2xl shadow-xl border-2 border-white/20 overflow-hidden`}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(profile.name)
                    )}
                  </div>
                  <span className="px-3 py-1 bg-white/60 dark:bg-black/20 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {profile.currency || "USD"}
                  </span>
                </div>
                <h3 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mb-2 truncate group-hover:text-blue-600 transition-colors">{profile.name}</h3>
                <p className="text-xs text-slate-400 font-bold mb-8 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Created {new Date(profile.created_at).toLocaleDateString()}
                </p>
                <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-5">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] inline-flex items-center gap-2">
                    Profile Details <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {detailProfile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 lg:p-4 bg-black/70 backdrop-blur-md" onClick={() => setDetailProfile(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className={`h-32 lg:h-40 bg-gradient-to-br ${GRADIENT_COLORS[detailProfile.colorIndex % GRADIENT_COLORS.length]} relative`}>
              <div className="absolute inset-0 bg-black/10" />
              <button onClick={() => setDetailProfile(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-all backdrop-blur-md z-20">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-8 lg:px-10 pb-8 lg:pb-10 relative">
              <div className="relative -mt-12 lg:-mt-16 mb-6">
                <div className={`w-24 h-24 lg:w-32 lg:h-32 rounded-[2rem] lg:rounded-[2.5rem] bg-gradient-to-tr ${GRADIENT_COLORS[detailProfile.colorIndex % GRADIENT_COLORS.length]} flex items-center justify-center text-white font-black text-3xl lg:text-5xl shadow-2xl border-8 border-white dark:border-slate-900 overflow-hidden`}>
                  {detailProfile.avatar_url ? (
                    <img src={detailProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(detailProfile.name)
                  )}
                </div>
                {activeProfile?.id === detailProfile.id && (
                  <div className="absolute bottom-1 right-1 w-8 h-8 lg:w-10 lg:h-10 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                )}
              </div>

              <div className="mb-8">
                <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{detailProfile.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg tracking-widest">{detailProfile.currency || "USD"}</div>
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(detailProfile.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 dark:bg-black/20 rounded-3xl p-6 mb-8 border border-black/5">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal ID</span>
                    <span className="font-mono text-[9px] text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-black/5">{detailProfile.id}</span>
                 </div>
              </div>

              {activeProfile?.id === detailProfile.id ? (
                <div className="w-full py-5 rounded-2xl text-center font-black text-blue-600 bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-6 h-6" /> Selected Profile
                </div>
              ) : (
                <button
                  onClick={() => handleSwitch(detailProfile)}
                  className="w-full py-5 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 group active:scale-95"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  Switch Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 lg:p-4 bg-black/70 backdrop-blur-md" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 lg:p-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tighter">New Profile</h2>
                <p className="text-blue-100 font-bold text-xs mt-1">Separate your financial life</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <X className="w-7 h-7" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-8 lg:p-10 space-y-6 lg:space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Profile Name *</label>
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl flex-shrink-0 border-2 border-blue-500/10">
                    {formData.name ? formData.name.charAt(0) : <User className="w-7 h-7" />}
                  </div>
                  <input required placeholder="e.g. Business Account" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency</label>
                  <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none appearance-none focus:ring-2 focus:ring-blue-500 shadow-inner">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Avatar URL</label>
                  <input type="url" placeholder="https://..." value={formData.avatar_url} onChange={e => setFormData({ ...formData, avatar_url: e.target.value })} className="w-full px-5 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
                </div>
              </div>

              <button type="submit" disabled={creating} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg shadow-2xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-3">
                {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Plus className="w-6 h-6" /> Create Profile</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
