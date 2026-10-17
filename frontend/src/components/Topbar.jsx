import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaQuestionCircle,
  FaChevronRight,
  FaCheck,
  FaTrash,
  FaRobot,
  FaFolder,
  FaProjectDiagram,
  FaSun,
  FaMoon,
} from "react-icons/fa";

import UserProfilePanel from "./UserProfilePanel";

const NOTIFICATIONS_KEY = "tanioNotifications";
const SETTINGS_KEY = "tanioSettings";

const defaultNotifications = [
  {
    id: "welcome",
    title: "Welcome to Tanio AI",
    message: "Your workspace is ready. Start building with AI.",
    type: "system",
    read: false,
    createdAt: new Date().toISOString(),
  },
];

function getStoredNotifications() {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("Failed to load notifications:", error);
  }

  return defaultNotifications;
}

function getStoredTheme() {
  try {
    const settings = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );
    const theme = settings?.appearance?.theme;

    return ["dark", "light", "system"].includes(theme)
      ? theme
      : "dark";
  } catch {
    return "dark";
  }
}

function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(
    getStoredNotifications
  );
  const [theme, setTheme] = useState(getStoredTheme);
  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [themeError, setThemeError] = useState("");

  const isDark =
    theme === "system" ? systemIsDark : theme === "dark";

  const nextTheme = isDark ? "light" : "dark";
  const themeLabel = `Switch to ${nextTheme} mode`;
  const themeDescription =
    theme === "system"
      ? `System Default: ${isDark ? "dark" : "light"} mode`
      : `${isDark ? "Dark" : "Light"} mode`;

  const pageInfo = {
    "/": {
      label: "Dashboard",
      description: "Overview of your Tanio workspace",
    },
    "/workspaces": {
      label: "Workspaces",
      description: "Organize your projects",
    },
    "/projects": {
      label: "Projects",
      description: "Manage your active projects",
    },
    "/content": {
      label: "Content",
      description: "Browse saved AI-generated content",
    },
    "/community": {
      label: "Community",
      description: "Connect with the Tanio community",
    },
    "/product-architect": {
      label: "Product Architect",
      description: "Plan products with AI",
    },
    "/tabletop-creator": {
      label: "Tabletop Creator",
      description: "Build campaigns and worlds with AI",
    },
    "/problem-solver": {
      label: "Problem Solver",
      description: "Explore problems and practical solutions",
    },
    "/learning-studio": {
      label: "Learning Studio",
      description: "Learn with lessons, flashcards, and quizzes",
    },
    "/help": {
      label: "Help Guide",
      description: "Learn how to use Tanio",
    },
    "/settings": {
      label: "Settings",
      description: "Manage your account and preferences",
    },
  };

  const currentPage = pageInfo[location.pathname] || {
    label: "Tanio AI",
    description: "AI-powered project creation",
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  useEffect(() => {
    try {
      localStorage.setItem(
        NOTIFICATIONS_KEY,
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error("Failed to save notifications:", error);
    }
  }, [notifications]);

  useEffect(() => {
    const updateNotifications = () => {
      setNotifications(getStoredNotifications());
    };

    const handleStorage = (event) => {
      if (event.key === NOTIFICATIONS_KEY || event.key === null) {
        updateNotifications();
      }
    };

    window.addEventListener(
      "tanio-notifications-updated",
      updateNotifications
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        "tanio-notifications-updated",
        updateNotifications
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      setTheme(getStoredTheme());
      setThemeError("");
    };

    const handleStorage = (event) => {
      if (event.key === SETTINGS_KEY || event.key === null) {
        updateTheme();
      }
    };

    window.addEventListener("tanio-settings-updated", updateTheme);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        "tanio-settings-updated",
        updateTheme
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemIsDark(media.matches);

    updateSystemTheme();
    media.addEventListener("change", updateSystemTheme);

    return () => {
      media.removeEventListener("change", updateSystemTheme);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleThemeToggle = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const currentSettings =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {};

      const updatedSettings = {
        ...currentSettings,
        appearance: {
          ...currentSettings.appearance,
          theme: nextTheme,
        },
      };

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(updatedSettings)
      );

      setTheme(nextTheme);
      setThemeError("");

      window.dispatchEvent(new Event("tanio-settings-updated"));
    } catch (error) {
      console.error("Unable to save theme:", error);
      setThemeError("Unable to save your theme. Please try again.");
    }
  };

  const markAsRead = (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  const getNotificationIcon = (type) => {
    if (type === "project") return FaProjectDiagram;
    if (type === "workspace") return FaFolder;
    return FaRobot;
  };

  const getRelativeTime = (date) => {
    if (!date) return "";

    const created = new Date(date).getTime();
    if (!Number.isFinite(created)) return "";

    const difference = Math.max(0, Date.now() - created);
    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  const controlClass =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-500 transition-all duration-200 hover:border-cyan-500/30 hover:bg-slate-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";

  return (
    <header className="sticky top-0 z-20 flex h-[72px] min-w-0 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-white">
              {currentPage.label}
            </h1>
            <FaChevronRight
              aria-hidden="true"
              className="hidden shrink-0 text-[8px] text-slate-500 sm:block"
            />
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-500 sm:inline">
              Tanio
            </span>
          </div>
          <p className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">
            {currentPage.description}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Theme */}
        <div className="relative">
          <button
            type="button"
            onClick={handleThemeToggle}
            aria-label={themeLabel}
            title={`${themeDescription}. ${themeLabel}`}
            className={controlClass}
          >
            {isDark ? (
              <FaSun aria-hidden="true" className="text-sm text-amber-400" />
            ) : (
              <FaMoon aria-hidden="true" className="text-sm text-cyan-600" />
            )}
          </button>

          {themeError && (
            <p
              role="alert"
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-red-800 bg-slate-900 p-3 text-xs text-red-400 shadow-xl"
            >
              {themeError}
            </p>
          )}
        </div>

        {/* Help */}
        <button
          type="button"
          onClick={() => navigate("/help")}
          aria-label="Help Guide"
          title="Help Guide"
          className={controlClass}
        >
          <FaQuestionCircle aria-hidden="true" className="text-sm" />
        </button>

        {/* Notifications */}
        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            aria-expanded={notificationsOpen}
            title="Notifications"
            className={`${controlClass} relative ${
              notificationsOpen ? "text-cyan-400" : ""
            }`}
          >
            <FaBell aria-hidden="true" className="text-sm" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-400 ring-2 ring-slate-900"
              />
            )}
          </button>

          {notificationsOpen && (
            <div className="fixed left-3 right-3 top-[76px] z-50 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[360px]">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">
                      Notifications
                    </h2>
                    {unreadCount > 0 && (
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-500">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Updates from your Tanio workspace
                  </p>
                </div>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotifications([])}
                    aria-label="Clear notifications"
                    title="Clear notifications"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <FaTrash aria-hidden="true" className="text-[10px]" />
                  </button>
                )}
              </div>

              <div className="max-h-[min(360px,60vh)] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-800 text-slate-500">
                      <FaBell aria-hidden="true" className="text-sm" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-300">
                      You're all caught up
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      New Tanio updates will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const NotificationIcon = getNotificationIcon(
                      notification.type
                    );

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className={`group relative flex w-full items-start gap-3 border-b border-slate-800 px-4 py-3 text-left transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 ${
                          notification.read
                            ? "bg-transparent"
                            : "bg-cyan-500/[0.025]"
                        }`}
                      >
                        {!notification.read && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-0 h-full w-[2px] bg-cyan-400"
                          />
                        )}

                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            notification.read
                              ? "border-slate-700 bg-slate-800 text-slate-500"
                              : "border-cyan-500/20 bg-cyan-500/10 text-cyan-500"
                          }`}
                        >
                          <NotificationIcon
                            aria-hidden="true"
                            className="text-xs"
                          />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span
                              className={`truncate text-xs font-semibold ${
                                notification.read
                                  ? "text-slate-300"
                                  : "text-white"
                              }`}
                            >
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span
                                aria-hidden="true"
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400"
                              />
                            )}
                          </span>
                          <span className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                            {notification.message}
                          </span>
                          <span className="mt-1.5 block text-[9px] font-medium uppercase tracking-wider text-slate-500">
                            {getRelativeTime(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5">
                  <span className="text-[10px] text-slate-500">
                    {notifications.length}{" "}
                    {notifications.length === 1
                      ? "notification"
                      : "notifications"}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="flex items-center gap-1.5 rounded text-[10px] font-medium text-cyan-500 transition hover:text-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                      <FaCheck aria-hidden="true" className="text-[8px]" />
                      Mark all as read
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mx-1 hidden h-8 w-px bg-slate-800 sm:block" />
        <UserProfilePanel />
      </div>
    </header>
  );
}

export default TopBar;