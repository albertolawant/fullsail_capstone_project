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
} from "react-icons/fa";

import UserProfilePanel from "./UserProfilePanel";

const NOTIFICATIONS_KEY = "tanioNotifications";

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
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(
      "Failed to load notifications:",
      error
    );
  }

  localStorage.setItem(
    NOTIFICATIONS_KEY,
    JSON.stringify(defaultNotifications)
  );

  return defaultNotifications;
}

function TopBar() {
  const location = useLocation();

  const navigate = useNavigate();

  const notificationRef = useRef(null);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notifications, setNotifications] = useState(
    getStoredNotifications
  );

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
    "/product-architect": {
      label: "Product Architect",
      description: "Plan products with AI",
    },
    "/tabletop-creator": {
      label: "Tabletop Creator",
      description: "Build campaigns and worlds with AI",
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

  const currentPage =
    pageInfo[location.pathname] || {
      label: "Tanio AI",
      description: "AI-powered project creation",
    };

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATIONS_KEY,
      JSON.stringify(notifications)
    );
  }, [notifications]);

  useEffect(() => {
    const updateNotifications = () => {
      setNotifications(getStoredNotifications());
    };

    window.addEventListener(
      "tanio-notifications-updated",
      updateNotifications
    );

    window.addEventListener(
      "storage",
      updateNotifications
    );

    return () => {
      window.removeEventListener(
        "tanio-notifications-updated",
        updateNotifications
      );

      window.removeEventListener(
        "storage",
        updateNotifications
      );
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

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  const markAsRead = (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
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

  const clearNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type) => {
    if (type === "project") {
      return FaProjectDiagram;
    }

    if (type === "workspace") {
      return FaFolder;
    }

    return FaRobot;
  };

  const getRelativeTime = (date) => {
    if (!date) {
      return "";
    }

    const now = new Date();
    const created = new Date(date);

    const difference =
      now.getTime() - created.getTime();

    const minutes = Math.floor(
      difference / 60000
    );

    const hours = Math.floor(
      difference / 3600000
    );

    const days = Math.floor(
      difference / 86400000
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    if (hours < 24) {
      return `${hours}h ago`;
    }

    if (days === 1) {
      return "Yesterday";
    }

    return `${days}d ago`;
  };

  return (
    <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/95 px-6 backdrop-blur-xl lg:px-8">
      {/* Left Side */}
      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-slate-100">
              {currentPage.label}
            </h1>

            <FaChevronRight className="text-[8px] text-slate-700" />

            <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-500 sm:inline">
              Tanio
            </span>
          </div>

          <p className="mt-0.5 hidden truncate text-[11px] text-slate-600 sm:block">
            {currentPage.description}
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Help */}
        <button
          type="button"
          onClick={() => navigate("/help")}
          aria-label="Help Guide"
          title="Help Guide"
          className="
            flex h-9 w-9 items-center justify-center
            rounded-xl border border-slate-800
            bg-slate-900/70 text-slate-500
            transition-all duration-200
            hover:border-cyan-500/20
            hover:bg-slate-800
            hover:text-cyan-300
          "
        >
          <FaQuestionCircle className="text-sm" />
        </button>

        {/* Notifications */}
        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                (current) => !current
              )
            }
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            title="Notifications"
            className={`
              group relative flex h-9 w-9
              items-center justify-center
              rounded-xl border
              transition-all duration-200
              ${
                notificationsOpen
                  ? "border-cyan-500/20 bg-slate-800 text-cyan-300"
                  : "border-slate-800 bg-slate-900/70 text-slate-500 hover:border-cyan-500/20 hover:bg-slate-800 hover:text-cyan-300"
              }
            `}
          >
            <FaBell className="text-sm" />

            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-400 ring-2 ring-slate-900" />
            )}
          </button>

          {/* Notification Dropdown */}
          {notificationsOpen && (
            <div
              className="
                absolute right-0 top-full z-50 mt-3
                w-[360px] overflow-hidden
                rounded-2xl border border-slate-800
                bg-slate-900/95
                shadow-2xl shadow-black/40
                backdrop-blur-xl
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">
                      Notifications
                    </h2>

                    {unreadCount > 0 && (
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[10px] text-slate-600">
                    Updates from your Tanio workspace
                  </p>
                </div>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearNotifications}
                    aria-label="Clear notifications"
                    title="Clear notifications"
                    className="
                      flex h-8 w-8 items-center
                      justify-center rounded-lg
                      text-slate-600 transition-all
                      hover:bg-red-500/10
                      hover:text-red-400
                    "
                  >
                    <FaTrash className="text-[10px]" />
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/40 text-slate-600">
                      <FaBell className="text-sm" />
                    </div>

                    <p className="mt-3 text-sm font-medium text-slate-300">
                      You're all caught up
                    </p>

                    <p className="mt-1 text-[11px] text-slate-600">
                      New Tanio updates will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const NotificationIcon =
                      getNotificationIcon(
                        notification.type
                      );

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() =>
                          markAsRead(
                            notification.id
                          )
                        }
                        className={`
                          group relative flex w-full
                          items-start gap-3 border-b
                          border-slate-800/70
                          px-4 py-3 text-left
                          transition-all duration-200
                          hover:bg-slate-800/60
                          ${
                            notification.read
                              ? "bg-transparent"
                              : "bg-cyan-500/[0.025]"
                          }
                        `}
                      >
                        {!notification.read && (
                          <span className="absolute left-0 top-0 h-full w-[2px] bg-cyan-400" />
                        )}

                        <span
                          className={`
                            mt-0.5 flex h-9 w-9
                            shrink-0 items-center
                            justify-center rounded-xl
                            border
                            ${
                              notification.read
                                ? "border-slate-700 bg-slate-800/60 text-slate-500"
                                : "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                            }
                          `}
                        >
                          <NotificationIcon className="text-xs" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p
                              className={`
                                truncate text-xs font-semibold
                                ${
                                  notification.read
                                    ? "text-slate-300"
                                    : "text-white"
                                }
                              `}
                            >
                              {notification.title}
                            </p>

                            {!notification.read && (
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                            )}
                          </div>

                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
                            {notification.message}
                          </p>

                          <p className="mt-1.5 text-[9px] font-medium uppercase tracking-wider text-slate-700">
                            {getRelativeTime(
                              notification.createdAt
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="flex items-center justify-between bg-slate-950/50 px-4 py-2.5">
                  <span className="text-[10px] text-slate-600">
                    {notifications.length}{" "}
                    {notifications.length === 1
                      ? "notification"
                      : "notifications"}
                  </span>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="
                        flex items-center gap-1.5
                        text-[10px] font-medium
                        text-cyan-400
                        transition-colors
                        hover:text-cyan-300
                      "
                    >
                      <FaCheck className="text-[8px]" />
                      Mark all as read
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-1 hidden h-8 w-px bg-slate-800 sm:block" />

        {/* User Account */}
        <UserProfilePanel />
      </div>
    </header>
  );
}

export default TopBar;