import React, { useEffect, useState } from "react";
import {
  Camera,
  Mail,
  Shield,
  Activity,
  DollarSign,
  Calendar,
  Edit,
  Loader2,
  X,
  Save,
  User,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, balance: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    currency: "USD",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const [profileRes, userRes] = await Promise.all([
        axios.get("http://localhost:3000/api/profile", { headers: { token } }),
        axios.get("http://localhost:3000/api/auth/user", {
          headers: { token },
        }),
      ]);

      const profiles = profileRes.data;
      if (!profiles || profiles.length === 0) {
        navigate("/create-profile");
        return;
      }
      setProfile(profiles[0]);
      setUser(userRes.data);

      const expRes = await axios.get(
        "http://localhost:3000/api/expense/getall",
        {
          headers: { token },
          params: { currentPage: 1 },
        },
      );
      const stateRes = await axios.get(
        "http://localhost:3000/api/expense/states",
        {
          headers: { token },
        },
      );
      const rows = stateRes.data?.[0];
      const balance = rows
        ? Number(rows.current_income) - Number(rows.current_expense)
        : 0;
      setStats({
        total: expRes.data.total || 0,
        balance,
      });
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        toast.error("Failed to load profile");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = () => {
    setEditData({
      name: profile?.name || "",
      currency: profile?.currency || "USD",
      avatar_url: profile?.avatar_url || "",
    });
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editData.name.trim()) {
      toast.error("Profile name is required");
      return;
    }
    const token = localStorage.getItem("token");
    setSaving(true);
    try {
      const res = await axios.put(
        `http://localhost:3000/api/profile/${profile.id}`,
        {
          name: editData.name,
          currency: editData.currency,
          avatar_url: editData.avatar_url || null,
        },
        { headers: { token } },
      );
      setProfile(res.data.profile);
      toast.success("Profile updated successfully!");
      setEditOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Profile
        </h1>
        <button
          onClick={openEdit}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5"
        >
          <Edit className="w-5 h-5" />
          Edit Profile
        </button>
      </div>

      <div className="glass-panel rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-xl overflow-hidden relative">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </div>

        <div className="px-10 pb-12 relative">
          {/* Avatar */}
          <div className="absolute -top-20 flex items-end">
            <div className="relative group cursor-pointer" onClick={openEdit}>
              <div className="w-40 h-40 rounded-full border-8 border-slate-50 dark:border-[#0b0f19] bg-gradient-to-tr from-blue-500 to-indigo-500 overflow-hidden flex items-center justify-center shadow-2xl relative z-10">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl font-black text-white">
                    {initials}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 z-20 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <Camera className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <div className="pt-28">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {profile?.name || "—"}
              </h2>
              <Shield className="w-6 h-6 text-blue-500 drop-shadow-sm" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-2 flex-wrap">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent font-bold">
                {user?.full_name || "Member"}
              </span>
              •&nbsp;
              <Mail className="w-4 h-4" />
              {user?.email || "—"}
              •&nbsp;
              <Calendar className="w-4 h-4" />
              Joined{" "}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Profile Info */}
            <div className="bg-black/5 dark:bg-white/5 p-8 rounded-3xl backdrop-blur-md">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
                Profile Details
              </h3>
              <div className="space-y-4 text-slate-700 dark:text-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">
                    Currency
                  </span>
                  <span className="font-bold">
                    {profile?.currency || "USD"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">
                    Full Name
                  </span>
                  <span className="font-bold">{user?.full_name || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">
                    Email
                  </span>
                  <span className="font-mono text-xs bg-black/10 dark:bg-white/10 px-3 py-1 rounded-lg truncate max-w-[160px]">
                    {user?.email || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">
                    Profile ID
                  </span>
                  <span className="font-mono text-xs bg-black/10 dark:bg-white/10 px-3 py-1 rounded-lg">
                    {profile?.id?.slice(0, 8)}…
                  </span>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="bg-black/5 dark:bg-white/5 p-8 rounded-3xl backdrop-blur-md">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
                Account Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 dark:bg-black/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                    <Activity className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Total Tx
                    </span>
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {stats.total}
                  </span>
                </div>
                <div className="bg-white/50 dark:bg-black/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Balance
                    </span>
                  </div>
                  <span
                    className={`text-3xl font-extrabold ${Number(stats.balance) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}
                  >
                    {Number(stats.balance) >= 0 ? "+" : ""}
                    {Number(stats.balance).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div>
                <h2 className="text-2xl font-extrabold text-white">
                  Edit Profile
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Update your profile information below.
                </p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              {/* Avatar Preview */}
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg overflow-hidden flex-shrink-0">
                  {editData.avatar_url ? (
                    <img
                      src={editData.avatar_url}
                      alt="avatar preview"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  ) : editData.name ? (
                    editData.name.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Avatar URL{" "}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.png"
                    value={editData.avatar_url}
                    onChange={(e) =>
                      setEditData({ ...editData, avatar_url: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Profile Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Profile Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Personal Account"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency
                </label>
                <select
                  value={editData.currency}
                  onChange={(e) =>
                    setEditData({ ...editData, currency: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="AUD">AUD ($) — Australian Dollar</option>
                  <option value="CAD">CAD ($) — Canadian Dollar</option>
                </select>
              </div>

              {/* User Info (read-only) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Account Info (read-only)
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">
                    Full Name
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {user?.full_name || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">
                    Email
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {user?.email || "—"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/30"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
