import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import logo from "../assets/cropped_logo.png";

import {
  FaHome,
  FaFolder,
  FaProjectDiagram,
  FaRobot,
  FaCog,
  FaBrain,
  FaDice,
  FaLightbulb,
  FaGraduationCap,
  FaQuestionCircle,
  FaSignOutAlt,
  FaChevronRight,
  FaChevronLeft,
  FaUsers,
} from "react-icons/fa";

const SIDEBAR_KEY = "tanioSidebarCollapsed";

const DEFAULT_MODULE_COLORS = {
  "product-architect": "#06b6d4",
  "tabletop-creator": "#9333ea",
  "problem-solver": "#10b981",
  "learning-studio": "#06b6d4",
};

const MAIN_NAVIGATION = [
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
  {
    to: "/community",
    label: "Community",
    icon: FaUsers,
  },
];

const AI_TOOLS = [
  {
    id: "product-architect",
    to: "/product-architect",
    label: "Product Architect",
    subtitle: "Product planning",
    icon: FaBrain,
  },
  {
    id: "tabletop-creator",
    to: "/tabletop-creator",
    label: "Tabletop Creator",
    subtitle: "World building",
    icon: FaDice,
  },
  {
    id: "problem-solver",
    to: "/problem-solver",
    label: "Problem Solver",
    subtitle: "Problem analysis",
    icon: FaLightbulb,
  },
  {
    id: "learning-studio",
    to: "/learning-studio",
    label: "Learning Studio",
    subtitle: "Lessons and study tools",
    icon: FaGraduationCap,
  },
];

const SUPPORT_NAVIGATION = [
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

function getModuleColor(moduleId, moduleColors) {
  const candidate = moduleColors?.[moduleId];

  return typeof candidate === "string" &&
    /^#[0-9a-f]{6}$/i.test(candidate)
    ? candidate.toLowerCase()
    : DEFAULT_MODULE_COLORS[moduleId] || "#06b6d4";
}

function hexToRgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function mixColors(first, second, amount) {
  const firstRgb = hexToRgb(first);
  const secondRgb = hexToRgb(second);

  return (
    "#" +
    firstRgb
      .map((value, index) =>
        Math.round(
          value + (secondRgb[index] - value) * amount
        )
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function luminance(hex) {
  const channels = hexToRgb(hex).map((value) => {
    const normalized = value / 255;

    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  );
}

function contrastRatio(first, second) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);

  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function readableAccent(color, background, isLight) {
  if (contrastRatio(color, background) >= 4.5) {
    return color;
  }

  const target = isLight ? "#000000" : "#ffffff";

  for (let step = 1; step <= 20; step += 1) {
    const adjusted = mixColors(color, target, step / 20);

    if (contrastRatio(adjusted, background) >= 4.5) {
      return adjusted;
    }
  }

  return target;
}

function Sidebar({
  dashboardMode = "basic",
  selectedModules = [],
  theme = "dark",
  moduleColors = DEFAULT_MODULE_COLORS,
}) {
  const navigate = useNavigate();

  const isBasicMode = dashboardMode === "basic";
  const isLight = theme === "light";

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [loggingOut, setLoggingOut] = useState(false);
  const logoutBusyRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_KEY,
        collapsed ? "true" : "false"
      );
    } catch (error) {
      console.error(
        "Unable to save sidebar preference:",
        error
      );
    }
  }, [collapsed]);

  const visibleMainNavigation = isBasicMode
    ? MAIN_NAVIGATION.filter(({ to }) =>
        ["/", "/projects", "/community"].includes(to)
      )
    : MAIN_NAVIGATION;

  const visibleAiTools = AI_TOOLS.filter((tool) =>
    selectedModules.includes(tool.id)
  );

  const visibleSupportNavigation = isBasicMode
    ? []
    : SUPPORT_NAVIGATION;

  const colors = {
    background: isLight ? "#ffffff" : "#020817",
    border: isLight ? "#dbe3ee" : "#1e293b",
    text: isLight ? "#334155" : "#94a3b8",
    muted: isLight ? "#64748b" : "#94a3b8",
    heading: isLight ? "#0f172a" : "#f8fafc",
    iconBackground: isLight ? "#f1f5f9" : "#152033",
    iconBorder: isLight ? "#dbe3ee" : "#334155",
    cyan: isLight ? "#0e7490" : "#67e8f9",
    cyanBackground: isLight ? "#ecfeff" : "#0b2535",
    cyanBorder: isLight ? "#a5dbe8" : "#164e63",
    purple: isLight ? "#7e22ce" : "#d8b4fe",
  };

  const focusClass =
    "focus-visible:outline-2 focus-visible:outline-offset-2";

  const hoverClass = isLight
    ? "hover:bg-[#f1f5f9]"
    : "hover:bg-[#152033]";

  const handleLogout = async () => {
    if (logoutBusyRef.current) {
      return;
    }

    logoutBusyRef.current = true;
    setLoggingOut(true);

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token");

    const controller = new AbortController();

    const timeoutId = window.setTimeout(
      () => controller.abort(),
      10000
    );

    try {
      if (token) {
        await fetch("http://127.0.0.1:8000/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      window.clearTimeout(timeoutId);

      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("tanioSession");
      localStorage.removeItem("tanioUser");

      // Appearance preferences remain saved.
      // Module colors are loaded from the next user's account.
      navigate("/signin", { replace: true });
    }
  };

  const renderTooltip = (label) => {
    if (!collapsed) {
      return null;
    }

    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[58px] z-50 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.heading,
        }}
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
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center overflow-visible rounded-xl text-sm font-medium transition-all duration-200 ${focusClass} ${
          collapsed
            ? "h-11 w-11 justify-center p-0"
            : "w-full gap-3 px-3 py-2.5"
        } ${isActive ? "" : hoverClass}`
      }
      style={({ isActive }) => ({
        backgroundColor: isActive
          ? isLight
            ? "#ecfeff"
            : "#152033"
          : undefined,
        color: isActive ? colors.heading : colors.text,
        outlineColor: colors.cyan,
        boxShadow: isActive
          ? `inset 0 0 0 1px ${colors.cyanBorder}`
          : undefined,
      })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full"
              style={{
                backgroundColor: isLight ? "#0891b2" : "#22d3ee",
                boxShadow: isLight
                  ? "none"
                  : "0 0 10px rgba(34, 211, 238, 0.5)",
              }}
            />
          )}

          <span
            className={`relative z-10 flex shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
              collapsed ? "h-8 w-8" : "h-9 w-9"
            }`}
            style={{
              backgroundColor: isActive
                ? colors.cyanBackground
                : colors.iconBackground,
              borderColor: isActive
                ? colors.cyanBorder
                : colors.iconBorder,
              color: isActive ? colors.cyan : colors.text,
            }}
          >
            <Icon aria-hidden="true" className="text-sm" />
          </span>

          {!collapsed && (
            <>
              <span className="relative z-10 truncate">
                {label}
              </span>

              <FaChevronRight
                aria-hidden="true"
                className={`relative z-10 ml-auto shrink-0 text-[9px] transition-all duration-200 ${
                  isActive
                    ? "translate-x-0"
                    : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                }`}
                style={{
                  color: isActive ? colors.cyan : colors.muted,
                }}
              />
            </>
          )}

          {renderTooltip(label)}
        </>
      )}
    </NavLink>
  );

  const renderAiNavItem = ({
    id,
    to,
    label,
    subtitle,
    icon: Icon,
  }) => {
    const accent = getModuleColor(id, moduleColors);

    const activeBackground = mixColors(
      colors.background,
      accent,
      isLight ? 0.09 : 0.16
    );

    const iconBackground = mixColors(
      colors.background,
      accent,
      isLight ? 0.1 : 0.18
    );

    const accentBorder = mixColors(
      colors.background,
      accent,
      isLight ? 0.4 : 0.5
    );

    const iconColor = readableAccent(
      accent,
      iconBackground,
      isLight
    );

    const activeTextColor = readableAccent(
      accent,
      activeBackground,
      isLight
    );

    return (
      <NavLink
        key={id}
        to={to}
        aria-label={label}
        title={collapsed ? label : undefined}
        className={({ isActive }) =>
          `group relative flex items-center overflow-visible rounded-xl border transition-all duration-200 ${focusClass} ${
            collapsed
              ? "h-11 w-11 justify-center p-0"
              : "w-full gap-3 px-3 py-3"
          } ${isActive ? "" : hoverClass}`
        }
        style={({ isActive }) => ({
          borderColor: isActive ? accentBorder : "transparent",
          backgroundColor: isActive
            ? activeBackground
            : undefined,
          color: colors.text,
          outlineColor: accent,
        })}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full"
                style={{
                  backgroundColor: accent,
                  boxShadow: isLight
                    ? "none"
                    : `0 0 10px ${accent}80`,
                }}
              />
            )}

            <span
              className={`flex shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${
                collapsed ? "h-8 w-8" : "h-10 w-10"
              }`}
              style={{
                backgroundColor: iconBackground,
                borderColor: accentBorder,
                color: iconColor,
              }}
            >
              <Icon aria-hidden="true" className="text-sm" />
            </span>

            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    style={{
                      color: isActive
                        ? colors.heading
                        : isLight
                          ? "#334155"
                          : "#cbd5e1",
                    }}
                  >
                    {label}
                  </p>

                  <p
                    className="mt-0.5 truncate text-[10px] transition-colors"
                    style={{
                      color: isActive
                        ? activeTextColor
                        : colors.muted,
                    }}
                  >
                    {subtitle}
                  </p>
                </div>

                <FaChevronRight
                  aria-hidden="true"
                  className={`shrink-0 text-[9px] transition-all ${
                    isActive
                      ? ""
                      : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  }`}
                  style={{
                    color: isActive
                      ? activeTextColor
                      : colors.muted,
                  }}
                />
              </>
            )}

            {renderTooltip(label)}
          </>
        )}
      </NavLink>
    );
  };

  const sectionLabel = (label, dotColor) => (
    <div className="mb-2 flex items-center gap-2 px-3">
      <span
        aria-hidden="true"
        className="h-1 w-1 rounded-full"
        style={{
          backgroundColor: dotColor,
        }}
      />

      <p
        className="text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{
          color: colors.muted,
        }}
      >
        {label}
      </p>
    </div>
  );

  return (
    <aside
      aria-label="Main sidebar"
      className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col overflow-visible border-r transition-[width,background-color,border-color] duration-300 motion-reduce:transition-none ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      {!isLight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/[0.06] blur-3xl" />
          <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-purple-500/[0.04] blur-3xl" />
        </div>
      )}

      <div
        className={`relative z-10 flex h-[72px] shrink-0 items-center justify-center border-b ${
          collapsed ? "" : "px-5"
        }`}
        style={{
          borderColor: colors.border,
        }}
      >
        <div
          className={`flex items-center justify-center ${
            isLight ? "rounded-xl" : ""
          } ${collapsed ? "h-12 w-12" : "px-3 py-2"}`}
          style={{
            backgroundColor: isLight ? "#020817" : undefined,
          }}
        >
          <img
            src={logo}
            alt="Tanio AI"
            className={`h-auto select-none object-contain transition-all duration-300 motion-reduce:transition-none ${
              collapsed ? "w-10" : "w-40"
            }`}
            draggable={false}
          />
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={
            collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          aria-expanded={!collapsed}
          aria-controls="tanio-sidebar-navigation"
          title={
            collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          className={`absolute -right-3 bottom-[-13px] z-40 flex h-7 w-7 items-center justify-center rounded-full border text-[9px] shadow-lg transition-all duration-200 ${focusClass}`}
          style={{
            backgroundColor: isLight ? "#ffffff" : "#0f172a",
            borderColor: colors.iconBorder,
            color: colors.cyan,
            outlineColor: colors.cyan,
          }}
        >
          {collapsed ? (
            <FaChevronRight aria-hidden="true" />
          ) : (
            <FaChevronLeft aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        id="tanio-sidebar-navigation"
        className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-5 ${
          collapsed ? "items-center px-3" : "px-4"
        }`}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: isLight
            ? "#cbd5e1 #ffffff"
            : "#334155 #020817",
        }}
      >
        <div className={collapsed ? "" : "w-full"}>
          {!collapsed &&
            sectionLabel("Workspace", colors.cyan)}

          <nav aria-label="Workspace" className="space-y-1">
            {visibleMainNavigation.map(renderStandardNavItem)}
          </nav>
        </div>

        <div
          aria-hidden="true"
          className={`my-6 h-px shrink-0 ${
            collapsed ? "w-10" : "w-full"
          }`}
          style={{
            backgroundColor: colors.border,
          }}
        />

        <div className={collapsed ? "" : "w-full"}>
          {!collapsed && (
            <div className="mb-2 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full"
                  style={{
                    backgroundColor: colors.purple,
                  }}
                />

                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    color: colors.muted,
                  }}
                >
                  AI Tools
                </p>
              </div>

              <span
                className="rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: colors.cyanBackground,
                  borderColor: colors.cyanBorder,
                  color: colors.cyan,
                }}
              >
                AI
              </span>
            </div>
          )}

          <nav aria-label="AI tools" className="space-y-1.5">
            {visibleAiTools.map(renderAiNavItem)}
          </nav>
        </div>

        {visibleSupportNavigation.length > 0 && (
          <div
            className={`mt-7 ${
              collapsed ? "" : "w-full"
            }`}
          >
            {!collapsed &&
              sectionLabel("Support", colors.muted)}

            <nav aria-label="Support" className="space-y-1">
              {visibleSupportNavigation.map(
                renderStandardNavItem
              )}
            </nav>
          </div>
        )}

        <div className="flex-1" />
      </div>

      <div
        className={`relative z-10 border-t pb-3 pt-3 ${
          collapsed ? "px-3" : "px-4"
        }`}
        style={{
          borderColor: colors.border,
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label={loggingOut ? "Signing out" : "Logout"}
          title={collapsed ? "Logout" : undefined}
          className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 disabled:cursor-wait disabled:opacity-60 ${focusClass} ${
            isLight
              ? "hover:bg-[#fef2f2]"
              : "hover:bg-[#25101c]"
          } ${
            collapsed
              ? "h-11 w-11 justify-center p-0"
              : "w-full gap-3 px-3 py-2.5"
          }`}
          style={{
            color: colors.text,
            outlineColor: isLight ? "#b91c1c" : "#f87171",
          }}
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
              collapsed ? "h-8 w-8" : "h-9 w-9"
            }`}
            style={{
              backgroundColor: colors.iconBackground,
              borderColor: colors.iconBorder,
              color: isLight ? "#b91c1c" : "#f87171",
            }}
          >
            <FaSignOutAlt
              aria-hidden="true"
              className="text-sm"
            />
          </span>

          {!collapsed && (
            <>
              <span>
                {loggingOut ? "Signing out..." : "Logout"}
              </span>

              <FaChevronRight
                aria-hidden="true"
                className="ml-auto text-[9px] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{
                  color: isLight ? "#b91c1c" : "#f87171",
                }}
              />
            </>
          )}

          {renderTooltip("Logout")}
        </button>

        {!collapsed && (
          <div
            className="mt-2 flex items-center justify-between px-3"
            style={{
              color: colors.muted,
            }}
          >
            <span className="text-[9px] font-medium uppercase tracking-[0.15em]">
              Tanio AI
            </span>
            <span className="text-[9px]">
              v1.0
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;