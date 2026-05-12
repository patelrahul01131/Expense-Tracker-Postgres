import React, { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useProfile } from "../contexts/ProfileContext";
import {
  LayoutDashboard,
  PieChart,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Users,
  ChevronDown,
  CheckCircle2,
  RefreshCw,
  Bell,
  DollarSign,
  UserPlus,
  Mail,
  Menu,
  X,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme();
  const { profiles, activeProfile, switchProfile } = useProfile();
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [userInitials, setUserInitials] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get("http://localhost:3000/api/auth/user", {
          headers: {
            token,
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
        const fullName = res.data?.full_name || res.data?.email || "User";
        setUserName(fullName);
        setUserInitials(
          fullName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        );
      } catch (error) {
        if (error?.response?.status === 401) {
          setTimeout(() => {
            toast.error("Token Expired");
            localStorage.removeItem("token");
            navigate("/login");
          }, 2000);
        } else {
          toast.error(error.message);
        }
      }
    };
    fetchUser();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target)
      ) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        "http://localhost:3000/api/groups/notifications",
        {
          headers: {
            token,
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      );
      setNotifications(res.data || []);
    } catch (e) {
      console.log("Notif fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchNotifications();
    console.log("refresh");
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleConfirmNotif = async (n, status) => {
    // Optimistic UI update
    setNotifications((prev) => prev.filter((notif) => notif.id !== n.id));

    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost:3000/api/groups/${n.group_id}/settlements/${n.data.settlement_id}/confirm`,
        { status },
        {
          headers: { token },
        },
      );
      toast.success(`Settlement ${status}`);
      fetchNotifications();
    } catch (e) {
      toast.error(e.response?.data?.message || "Action failed");
      fetchNotifications(); // Re-fetch to restore state if needed
    }
  };

  const handleDismissNotif = async (n) => {
    // Optimistic UI update
    setNotifications((prev) => prev.filter((notif) => notif.id !== n.id));

    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost:3000/api/groups/notifications/${n.id}/read`,
        {},
        { headers: { token } },
      );
    } catch (e) {
      console.log("Error dismissing notification", e);
    }
  };

  const handleAcceptInvite = async (n, status) => {
    // Optimistic UI update
    setNotifications((prev) => prev.filter((notif) => notif.id !== n.id));

    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost:3000/api/groups/accept-invite`,
        { notificationId: n.id, status },
        {
          headers: { token },
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      );
      toast.success(`Invitation ${status}`);
      fetchNotifications();
      if (status === "accepted") {
        navigate(`/groups/${n.group_id}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Action failed");
      fetchNotifications();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("activeProfile");
    toast.success("Logged out successfully");
    setTimeout(() => {
      navigate("/login");
    }, 2000);
  };

  const handleSwitchProfile = (profile) => {
    switchProfile(profile);
    setDropdownOpen(false);
    toast.success("Profile switched successfully");
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Analytics", path: "/analytics", icon: PieChart },
    { name: "My Profile", path: "/profile", icon: User },
    { name: "All Profiles", path: "/profiles", icon: Users },
    { name: "Groups", path: "/groups", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const activeProfileInitials = activeProfile?.name
    ? activeProfile.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0f19] bg-gradient-radial transition-colors duration-200 overflow-hidden">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 glass lg:m-4 lg:rounded-3xl flex flex-col z-[50] transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-8 flex items-center justify-between border-b border-white/20 dark:border-white/5">
          <h1 className="text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
            ExpenseSync
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-3 mt-6 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all duration-300 font-medium ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 translate-x-1"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 hover:translate-x-1"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm tracking-wide">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/20 dark:border-white/5 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between px-5 py-3 w-full rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all duration-300 font-medium text-sm"
          >
            <div className="flex items-center space-x-3">
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-500" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-5 py-3 w-full rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-300 font-medium text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative lg:mr-4 lg:my-4 lg:rounded-3xl glass z-10">
        <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-10 border-b border-white/20 dark:border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="flex items-center gap-2 lg:gap-5">
            {/* Notification bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="p-2 lg:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative"
              >
                <Bell className="h-5 w-5 lg:h-6 lg:w-6 text-slate-600 dark:text-slate-300" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1.5 lg:top-2 lg:right-2.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-black text-white animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-[290px] sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 flex justify-between items-center">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Notifications
                    </h3>
                    {notifications.length > 0 && (
                      <span className="text-[10px] font-black text-blue-500 uppercase">
                        {notifications.length} Pending
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="pb-10 text-center">
                        <div className="flex items-end justify-end w-full p-5">
                          <RefreshCw
                            className="h-5 w-5 cursor-pointer text-slate-200 dark:text-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:rotate-180 transition-transform duration-500 ease-in-out"
                            onClick={handleRefresh}
                          />
                        </div>

                        <Bell className="w-10 h-10 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                        <p className="text-xs text-slate-400 font-bold">
                          No new notifications
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-4 border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="flex gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === "group_invite" ? "bg-indigo-500/10" : "bg-blue-500/10"}`}
                            >
                              {n.type === "group_invite" ? (
                                <UserPlus className="w-4 h-4 text-indigo-500" />
                              ) : (
                                <DollarSign className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              {n.type === "group_invite" ? (
                                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                                  <span className="font-black">
                                    {n.sender_name}
                                  </span>{" "}
                                  invited you to join{" "}
                                  <span className="font-black text-indigo-600">
                                    {n.data?.group_name}
                                  </span>
                                </p>
                              ) : n.type === "payment_reminder" ? (
                                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                                  <span className="font-black">
                                    {n.sender_name}
                                  </span>{" "}
                                  reminded you to pay{" "}
                                  <span className="text-amber-600 font-black">
                                    ${n.data.amount}
                                  </span>{" "}
                                  in{" "}
                                  <span className="font-black">
                                    {n.group_name}
                                  </span>
                                </p>
                              ) : (
                                <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                                  <span className="font-black">
                                    {n.sender_name}
                                  </span>{" "}
                                  sent a settlement request of{" "}
                                  <span className="text-blue-600 font-black">
                                    ${n.data.amount}
                                  </span>{" "}
                                  in{" "}
                                  <span className="font-black">
                                    {n.group_name}
                                  </span>
                                </p>
                              )}
                              <div className="flex gap-2 mt-2">
                                {n.type !== "payment_reminder" ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        n.type === "group_invite"
                                          ? handleAcceptInvite(n, "accepted")
                                          : handleConfirmNotif(n, "accepted")
                                      }
                                      className={`flex-1 py-1.5 text-white text-[10px] font-black rounded-lg transition-colors ${n.type === "group_invite" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700"}`}
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() =>
                                        n.type === "group_invite"
                                          ? handleAcceptInvite(n, "rejected")
                                          : handleConfirmNotif(n, "rejected")
                                      }
                                      className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                      Decline
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleDismissNotif(n)}
                                    className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-lg hover:bg-slate-200 transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700" />

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 lg:gap-3 cursor-pointer group px-1 lg:px-2 py-1.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors leading-none mb-0.5">
                    {userName || "…"}
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 font-semibold leading-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                    {activeProfile?.name || "No Profile"}
                  </p>
                </div>
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md text-xs lg:text-sm overflow-hidden">
                  {activeProfile?.avatar_url ? (
                    <img
                      src={activeProfile.avatar_url}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    activeProfileInitials
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Panel */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 lg:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User info */}
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-blue-600/5 to-indigo-600/5">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {userName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Switch profile below
                    </p>
                  </div>

                  {/* Profile list */}
                  <div className="py-2 max-h-60 overflow-y-auto">
                    {profiles.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        No profiles found
                      </p>
                    ) : (
                      profiles?.map((profile, i) => {
                        const isActive = activeProfile?.id === profile.id;
                        const initials = profile.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2);
                        const COLORS = [
                          "from-blue-500 to-indigo-500",
                          "from-emerald-500 to-teal-500",
                          "from-rose-500 to-pink-500",
                          "from-amber-500 to-orange-500",
                          "from-purple-500 to-violet-500",
                        ];
                        return (
                          <button
                            key={profile?.id}
                            onClick={() => handleSwitchProfile(profile)}
                            className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left ${
                              isActive
                                ? "bg-blue-50 dark:bg-blue-900/20"
                                : "hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${COLORS[i % COLORS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden`}
                            >
                              {profile.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt="p"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-bold truncate ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}
                              >
                                {profile.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {profile.currency || "USD"}
                              </p>
                            </div>
                            {isActive && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="border-t border-slate-100 dark:border-white/5 p-2 space-y-1">
                    <button
                      onClick={() => {
                        navigate("/profiles");
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                      <Users className="w-4 h-4" /> Manage Profiles
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10 relative custom-scrollbar">
          <div className="max-w-6xl mx-auto h-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
