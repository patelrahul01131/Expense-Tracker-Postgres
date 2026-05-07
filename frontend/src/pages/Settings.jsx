import React, { useState, useEffect } from "react";
import {
  Bell,
  Lock,
  Globe,
  CreditCard,
  Shield,
  Palette,
  Loader2,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from "../contexts/ThemeContext";
import { useProfile } from "../contexts/ProfileContext";
import { useNavigate } from "react-router-dom";

function getHeaders() {
  const token = localStorage.getItem("token");
  const profile = JSON.parse(localStorage.getItem("activeProfile") || "null");
  return { token, ...(profile?.id ? { "x-profile-id": profile.id } : {}) };
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("General");
  const { theme, toggleTheme } = useTheme();
  const { activeProfile, fetchProfiles } = useProfile();
  const navigate = useNavigate();

  // General / Profile settings
  const [currency, setCurrency] = useState("USD");
  const [savingGeneral, setSavingGeneral] = useState(false);

  // User info
  const [userInfo, setUserInfo] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Security / password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const tabs = [
    { name: "General", icon: Globe },
    { name: "Appearance", icon: Palette },
    { name: "Security", icon: Lock },
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingSettings(true);
      if (activeProfile == null) {
        setTimeout(() => {
          toast.error("Failed To Load Profile Please Reselect Profile");
          navigate("/profiles");
        }, 2000);
        return;
      }
      try {
        const res = await axios.get("http://localhost:3000/api/settings", {
          headers: getHeaders(),
        });
        setUserInfo(res.data.user);
        if (res.data.profile?.currency) {
          setCurrency(res.data.profile.currency);
        }
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [activeProfile?.id]);

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      await axios.patch(
        "http://localhost:3000/api/settings/profile",
        { currency },
        { headers: getHeaders() },
      );
      await fetchProfiles(); // refresh global profile data
      toast.success("Settings saved!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save settings");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await axios.patch(
        "http://localhost:3000/api/settings/password",
        { currentPassword, newPassword },
        { headers: getHeaders() },
      );
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
          Managing settings for{" "}
          <span className="text-blue-500 font-bold">
            {activeProfile?.name || "your profile"}
          </span>
        </p>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar */}
        <div className="w-full md:w-72 border-r border-black/5 dark:border-white/5 p-6 space-y-2 bg-black/5 dark:bg-white/5 backdrop-blur-md">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === tab.name
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 translate-x-1"
                  : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}

          {/* Account info card */}
          {userInfo && (
            <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                Account
              </p>
              <div className="bg-white/50 dark:bg-black/20 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {userInfo.full_name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {userInfo.email}
                </p>
                <p className="text-xs text-slate-400">
                  Joined{" "}
                  {new Date(userInfo.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-8 md:p-12 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight relative z-10">
            {activeTab} Settings
          </h2>

          <div className="space-y-8 relative z-10">
            {/* ── GENERAL ── */}
            {activeTab === "General" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                {loadingSettings ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <>
                    {/* Active profile info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-5">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                        Active Profile
                      </p>
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {activeProfile?.name || "—"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Changes below apply to this profile.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                        Primary Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-black/5 dark:bg-black/20 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                      >
                        <option value="USD">USD ($) — US Dollar</option>
                        <option value="EUR">EUR (€) — Euro</option>
                        <option value="GBP">GBP (£) — British Pound</option>
                        <option value="INR">INR (₹) — Indian Rupee</option>
                        <option value="AUD">AUD ($) — Australian Dollar</option>
                        <option value="CAD">CAD ($) — Canadian Dollar</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-black/5 dark:border-white/5 flex justify-end">
                      <button
                        onClick={handleSaveGeneral}
                        disabled={savingGeneral}
                        className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all hover:shadow-blue-600/50 hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        {savingGeneral ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── APPEARANCE ── */}
            {activeTab === "Appearance" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Theme
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => theme !== "light" && toggleTheme()}
                      className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                        theme === "light"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <span className="text-lg">☀️</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          Light
                        </p>
                        <p className="text-xs text-slate-500">Clean & bright</p>
                      </div>
                      {theme === "light" && (
                        <CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto" />
                      )}
                    </button>
                    <button
                      onClick={() => theme !== "dark" && toggleTheme()}
                      className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                        theme === "dark"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
                        <span className="text-lg">🌙</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          Dark
                        </p>
                        <p className="text-xs text-slate-500">Easy on eyes</p>
                      </div>
                      {theme === "dark" && (
                        <CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {activeTab === "Security" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <form
                  onSubmit={handleChangePassword}
                  className="space-y-5 max-w-md"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-4 py-3 pr-12 bg-black/5 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all border-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((p) => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showCurrent ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full px-4 py-3 pr-12 bg-black/5 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all border-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((p) => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showNew ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-3 bg-black/5 dark:bg-black/20 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all border-none"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-rose-500 mt-1 font-semibold">
                        Passwords do not match
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={
                      savingPassword ||
                      !currentPassword ||
                      !newPassword ||
                      newPassword !== confirmPassword
                    }
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingPassword ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                    Change Password
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
