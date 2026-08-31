import { useEffect, useState } from "react";

import logo from "../assets/cropped_logo.png";

import { NavLink, useNavigate } from "react-router-dom";

import {
  FaHome,
  FaFolder,
  FaProjectDiagram,
  FaRobot,
  FaCog,
  FaBrain,
  FaDice,
  FaQuestionCircle,
  FaSignOutAlt,
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";

const SIDEBAR_KEY = "tanioSidebarCollapsed";

function Sidebar() {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(
      SIDEBAR_KEY,
      collapsed ? "true" : "false"
    );
  }, [collapsed]);

  const mainNavigation = [
    {
      to: "/",
      label: "Dashboard",
      icon: FaHome,
      end: true,
    },
    {
      to: "/workspaces",
      label: "Workspaces",
      icon: FaFolder,
    },
    {
      to: "/projects",
      label: "Projects",
      icon: FaProjectDiagram,
    },
    {
      to: "/content",
      label: "Content",
      icon: FaRobot,
    },
  ];

  const aiTools = [
    {
      to: "/product-architect",
      label: "Product Architect",
      subtitle: "Product planning",
      icon: FaBrain,
      accent: "cyan",
    },
    {
      to: "/tabletop-creator",
      label: "Tabletop Creator",
      subtitle: "World building",
      icon: FaDice,
      accent: "purple",
    },
  ];

  const supportNavigation = [
    {
      to: "/help",
      label: "Help Guide",
      icon: FaQuestionCircle,
    },
    {
      to: "/settings",
      label: "Settings",
      icon: FaCog,
    },
  ];

  const handleLogout = async () => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    try {
      if (token) {
        await fetch("http://127.0.0.1:8000/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("tanioSession");
      localStorage.removeItem("tanioUser");

      navigate("/signin", { replace: true });
    }
  };

  const Tooltip = ({ label }) => {
    if (!collapsed) {
      return null;
    }

    return (
      <span
        className="
          pointer-events-none absolute left-[58px] z-50
          whitespace-nowrap rounded-lg border border-slate-700
          bg-slate-900 px-3 py-2 text-xs font-medium text-white
          opacity-0 shadow-xl transition-opacity duration-150
          group-hover:opacity-100
        "
      >
        {label}
      </span>
    );
  };

  const renderStandardNavItem = ({
    to,
    label,
    icon: Icon,
    end = false,
  }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `
        group relative flex items-center overflow-visible rounded-xl
        text-sm font-medium transition-all duration-200
        ${
          collapsed
            ? "h-11 w-11 justify-center p-0"
            : "w-full gap-3 px-3 py-2.5"
        }
        ${
          isActive
            ? "bg-slate-800/75 text-white ring-1 ring-cyan-500/10"
            : "text-slate-400 hover:bg-slate-800/45 hover:text-slate-100"
        }
        `
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <>
              <span className="absolute left-0 bottom-2 top-2 w-[3px] rounded-r-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />

              <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400/[0.035] to-transparent" />
            </>
          )}

          <span
            className={`
              relative z-10 flex shrink-0 items-center justify-center
              rounded-lg border transition-all duration-200
              ${
                collapsed
                  ? "h-8 w-8"
                  : "h-9 w-9"
              }
              ${
                isActive
                  ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
                  : "border-slate-700/70 bg-slate-800/60 text-slate-400 group-hover:border-cyan-500/20 group-hover:bg-cyan-500/[0.05] group-hover:text-cyan-300"
              }
            `}
          >
            <Icon className="text-sm" />
          </span>

          {!collapsed && (
            <>
              <span className="relative z-10 truncate">
                {label}
              </span>

              <FaChevronRight
                className={`
                  relative z-10 ml-auto text-[9px]
                  transition-all duration-200
                  ${
                    isActive
                      ? "translate-x-0 text-cyan-400"
                      : "-translate-x-1 text-slate-700 opacity-0 group-hover:translate-x-0 group-hover:text-slate-500 group-hover:opacity-100"
                  }
                `}
              />
            </>
          )}

          <Tooltip label={label} />
        </>
      )}
    </NavLink>
  );

  const renderAiNavItem = ({
    to,
    label,
    subtitle,
    icon: Icon,
    accent,
  }) => (
    <NavLink
      key={to}
      to={to}
      aria-label={label}
      className={({ isActive }) =>
        `
        group relative flex items-center overflow-visible
        rounded-xl border transition-all duration-200
        ${
          collapsed
            ? "h-11 w-11 justify-center p-0"
            : "w-full gap-3 px-3 py-3"
        }
        ${
          isActive
            ? accent === "purple"
              ? "border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-slate-800/40"
              : "border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-slate-800/40"
            : "border-transparent hover:border-slate-800 hover:bg-slate-800/35"
        }
        `
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className={`
                absolute left-0 bottom-2.5 top-2.5 w-[3px]
                rounded-r-full
                ${
                  accent === "purple"
                    ? "bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.7)]"
                    : "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]"
                }
              `}
            />
          )}

          <span
            className={`
              flex shrink-0 items-center justify-center rounded-xl
              border transition-all duration-200
              ${
                collapsed
                  ? "h-8 w-8"
                  : "h-10 w-10"
              }
              ${
                isActive
                  ? accent === "purple"
                    ? "border-purple-400/30 bg-purple-500/10 text-purple-300"
                    : "border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                  : accent === "purple"
                  ? "border-slate-700/70 bg-slate-800/70 text-slate-400 group-hover:border-purple-500/25 group-hover:bg-purple-500/[0.06] group-hover:text-purple-300"
                  : "border-slate-700/70 bg-slate-800/70 text-slate-400 group-hover:border-cyan-500/25 group-hover:bg-cyan-500/[0.06] group-hover:text-cyan-300"
              }
            `}
          >
            <Icon className="text-sm" />
          </span>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p
                  className={`
                    truncate text-sm font-medium
                    ${
                      isActive
                        ? "text-white"
                        : "text-slate-300 group-hover:text-white"
                    }
                  `}
                >
                  {label}
                </p>

                <p
                  className={`
                    mt-0.5 truncate text-[10px] transition-colors
                    ${
                      isActive
                        ? accent === "purple"
                          ? "text-purple-300/70"
                          : "text-cyan-300/70"
                        : "text-slate-600 group-hover:text-slate-500"
                    }
                  `}
                >
                  {subtitle}
                </p>
              </div>

              <FaChevronRight
                className={`
                  text-[9px] transition-all
                  ${
                    isActive
                      ? accent === "purple"
                        ? "text-purple-400"
                        : "text-cyan-400"
                      : "text-slate-700 opacity-0 group-hover:opacity-100"
                  }
                `}
              />
            </>
          )}

          <Tooltip label={label} />
        </>
      )}
    </NavLink>
  );

  return (
    <aside
      className={`
        sticky top-0 z-30 flex h-screen shrink-0 flex-col
        overflow-visible border-r border-slate-800/80
        bg-[#020817] transition-[width] duration-300
        ${
          collapsed
            ? "w-[72px]"
            : "w-64"
        }
      `}
    >
      {/* Background effects */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/[0.06] blur-3xl" />

      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-purple-500/[0.04] blur-3xl" />

      {/* Logo */}
      <div
        className={`
          relative z-10 flex h-[72px] shrink-0 items-center
          border-b border-slate-800/80
          ${
            collapsed
              ? "justify-center"
              : "justify-center px-5"
          }
        `}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        <img
          src={logo}
          alt="Tanio AI"
          className={`
            h-auto select-none object-contain
            transition-all duration-300
            ${
              collapsed
                ? "w-11"
                : "w-40"
            }
          `}
          draggable={false}
        />

        {/* Collapse button */}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          className="
            absolute -right-3 bottom-[-13px] z-40
            flex h-7 w-7 items-center justify-center rounded-full
            border border-slate-700 bg-slate-900
            text-[9px] text-slate-400 shadow-lg
            transition-all duration-200
            hover:border-cyan-500/30 hover:bg-slate-800
            hover:text-cyan-300
          "
        >
          {collapsed ? (
            <FaChevronRight />
          ) : (
            <FaChevronLeft />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div
        className={`
          relative z-10 flex flex-1 flex-col overflow-y-auto
          overflow-x-visible py-5
          ${
            collapsed
              ? "items-center px-3"
              : "px-4"
          }
        `}
      >
        {/* Workspace */}
        <div className={collapsed ? "" : "w-full"}>
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="h-1 w-1 rounded-full bg-cyan-400/70" />

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Workspace
              </p>
            </div>
          )}

          <nav
            className={
              collapsed
                ? "space-y-1"
                : "space-y-1"
            }
          >
            {mainNavigation.map(renderStandardNavItem)}
          </nav>
        </div>

        {/* Divider */}
        <div
          className={`
            my-6 h-px bg-gradient-to-r
            from-transparent via-slate-800 to-transparent
            ${
              collapsed
                ? "w-10"
                : "w-full"
            }
          `}
        />

        {/* AI Tools */}
        <div className={collapsed ? "" : "w-full"}>
          {!collapsed && (
            <div className="mb-2 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-purple-400/70" />

                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                  AI Tools
                </p>
              </div>

              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                AI
              </span>
            </div>
          )}

          <nav className="space-y-1.5">
            {aiTools.map(renderAiNavItem)}
          </nav>
        </div>

        {/* Support */}
        <div
          className={`
            mt-7
            ${
              collapsed
                ? ""
                : "w-full"
            }
          `}
        >
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="h-1 w-1 rounded-full bg-slate-500" />

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Support
              </p>
            </div>
          )}

          <nav className="space-y-1">
            {supportNavigation.map(renderStandardNavItem)}
          </nav>
        </div>

        <div className="flex-1" />
      </div>

      {/* Footer */}
      <div
        className={`
          relative z-10 border-t border-slate-800/80
          ${
            collapsed
              ? "px-3 pb-3 pt-3"
              : "px-4 pb-3 pt-3"
          }
        `}
      >
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          className={`
            group relative flex items-center rounded-xl
            text-sm font-medium text-slate-400
            transition-all duration-200
            hover:bg-red-500/[0.07] hover:text-red-400
            ${
              collapsed
                ? "h-11 w-11 justify-center p-0"
                : "w-full gap-3 px-3 py-2.5"
            }
          `}
        >
          <span
            className={`
              flex shrink-0 items-center justify-center rounded-lg
              border border-slate-700/70 bg-slate-800/60
              text-slate-400 transition-all duration-200
              group-hover:border-red-500/20
              group-hover:bg-red-500/10
              group-hover:text-red-400
              ${
                collapsed
                  ? "h-8 w-8"
                  : "h-9 w-9"
              }
            `}
          >
            <FaSignOutAlt className="text-sm" />
          </span>

          {!collapsed && (
            <>
              <span>Logout</span>

              <FaChevronRight className="ml-auto text-[9px] text-slate-700 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-red-400/60 group-hover:opacity-100" />
            </>
          )}

          <Tooltip label="Logout" />
        </button>

        {!collapsed && (
          <div className="mt-2 flex items-center justify-between px-3">
            <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-slate-700">
              Tanio AI
            </span>

            <span className="text-[9px] text-slate-700">
              v1.0
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;