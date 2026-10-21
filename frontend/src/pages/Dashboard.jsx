import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RecentContent from "../components/RecentContent";
import { notifyProjectCreated } from "../utils/notifications";

const API_URL = "http://127.0.0.1:8000";

const PROJECT_MODULE_IDS = ["product-architect", "tabletop-creator"];

const DEFAULT_MODULE_COLORS = {
  "product-architect": "#06b6d4",
  "tabletop-creator": "#9333ea",
  "problem-solver": "#10b981",
  "learning-studio": "#06b6d4",
};

const MODULES = [
  {
    id: "product-architect",
    name: "Product Architect",
    subtitle: "AI Product Planning",
    description:
      "Turn an idea into structured product strategy, documentation, and visual identity with AI.",
    icon: "⚡",
    route: "/product-architect",
    buttonLabel: "Open Product Architect",
    features: ["PRDs", "Personas", "User Stories", "Logos"],
  },
  {
    id: "tabletop-creator",
    name: "Tabletop Creator",
    subtitle: "AI Tabletop Design",
    description:
      "Build complete tabletop worlds, characters, adventures, encounters, and locations with AI.",
    icon: "🎲",
    route: "/tabletop-creator",
    buttonLabel: "Open Tabletop Creator",
    features: ["Campaigns", "NPCs", "Quests", "Locations"],
  },
  {
    id: "problem-solver",
    name: "Problem Solver",
    subtitle: "AI Problem Analysis",
    description:
      "Break down complex problems, explore multiple solutions, compare tradeoffs, and build a clear action plan with AI.",
    icon: "💡",
    route: "/problem-solver",
    buttonLabel: "Open Problem Solver",
    beta: true,
    features: ["Root Causes", "Solutions", "Pros & Cons", "Action Plans"],
  },
  {
    id: "learning-studio",
    name: "Learning Studio",
    subtitle: "AI Learning Tools",
    description:
      "Explore topics with AI-generated lessons, flashcards, and quizzes.",
    icon: "🎓",
    route: "/learning-studio",
    buttonLabel: "Open Learning Studio",
    beta: true,
    features: ["Lessons", "Flashcards", "Quizzes"],
  },
];

const FIELD_CLASS =
  "w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50";

const SECONDARY_BUTTON =
  "rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

function getDefaultProjectType(selectedModules) {
  return (
    PROJECT_MODULE_IDS.find((moduleId) =>
      selectedModules.includes(moduleId)
    ) || ""
  );
}

function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
    false
  );
}

function getRequestError(data, fallback) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return (
      data.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(" ") || fallback
    );
  }

  return fallback;
}

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
        Math.round(value + (secondRgb[index] - value) * amount)
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

function getModuleStyles(moduleId, moduleColors, theme) {
  const color = getModuleColor(moduleId, moduleColors);
  const isLight = theme === "light";
  const surface = isLight ? "#ffffff" : "#0f172a";

  const iconBackground = mixColors(
    surface,
    color,
    isLight ? 0.1 : 0.17
  );

  const featureBackground = mixColors(
    surface,
    color,
    isLight ? 0.06 : 0.1
  );

  const buttonText =
    contrastRatio(color, "#000000") >=
    contrastRatio(color, "#ffffff")
      ? "#000000"
      : "#ffffff";

  return {
    color,
    card: {
      borderColor: mixColors(surface, color, isLight ? 0.42 : 0.48),
      backgroundColor: surface,
      backgroundImage: `linear-gradient(135deg, ${mixColors(
        surface,
        color,
        isLight ? 0.07 : 0.16
      )}, ${surface} 72%)`,
      outlineColor: color,
    },
    selectedCard: {
      borderColor: color,
      backgroundColor: mixColors(
        surface,
        color,
        isLight ? 0.09 : 0.17
      ),
      boxShadow: `0 0 0 1px ${color}`,
      outlineColor: color,
    },
    unselectedCard: {
      borderColor: isLight ? "#cbd5e1" : "#334155",
      backgroundColor: surface,
      outlineColor: color,
    },
    icon: {
      borderColor: mixColors(surface, color, 0.4),
      backgroundColor: iconBackground,
      color: readableAccent(color, iconBackground, isLight),
    },
    subtitle: {
      color: readableAccent(color, surface, isLight),
    },
    feature: {
      borderColor: mixColors(surface, color, 0.35),
      backgroundColor: featureBackground,
      color: readableAccent(color, featureBackground, isLight),
    },
    button: {
      backgroundColor: color,
      color: buttonText,
      outlineColor: color,
    },
    glow: {
      backgroundColor: color,
      opacity: isLight ? 0.06 : 0.1,
    },
  };
}

function BetaBadge() {
  return (
    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
      Beta
    </span>
  );
}

function DashboardViewSelector({ mode, onChange, theme }) {
  const id = useId();
  const isLight = theme === "light";

  const modes = [
    {
      value: "basic",
      title: "Basic Mode",
      description:
        "Essential tools and simple navigation for a focused workspace.",
      accent: isLight ? "#0e7490" : "#67e8f9",
      border: isLight ? "#0891b2" : "#22d3ee",
      background: isLight ? "#ecfeff" : "#0b2535",
    },
    {
      value: "advanced",
      title: "Advanced Mode",
      description:
        "Statistics, search, shortcuts, and recent activity in one place.",
      accent: isLight ? "#7e22ce" : "#d8b4fe",
      border: isLight ? "#9333ea" : "#c084fc",
      background: isLight ? "#faf5ff" : "#21172f",
    },
  ];

  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      className="mb-6 min-w-0 rounded-2xl border p-5 shadow-sm sm:p-6"
      style={{
        backgroundColor: isLight ? "#ffffff" : "#0b1220",
        borderColor: isLight ? "#dbe3ee" : "#243147",
      }}
    >
      <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: isLight ? "#ecfeff" : "#102638",
                borderColor: isLight ? "#a5dbe8" : "#214358",
                color: isLight ? "#0e7490" : "#67e8f9",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M4 7h16M4 17h16" />
                <rect x="7" y="4" width="4" height="6" rx="1.5" />
                <rect x="13" y="14" width="4" height="6" rx="1.5" />
              </svg>
            </span>

            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: isLight ? "#0e7490" : "#67e8f9" }}
              >
                Make It Yours
              </p>

              <h2
                id={`${id}-title`}
                className="mt-1 text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: isLight ? "#0f172a" : "#f8fafc" }}
              >
                Dashboard View
              </h2>
            </div>
          </div>

          <p
            id={`${id}-description`}
            className="mt-4 text-sm leading-6"
            style={{ color: isLight ? "#526277" : "#94a3b8" }}
          >
            Choose the experience that best matches how you want to work.
          </p>

          <p
            className="mt-2 text-xs leading-5"
            style={{ color: isLight ? "#64748b" : "#94a3b8" }}
          >
            Switch views anytime.
          </p>
        </div>

        <div
          role="group"
          aria-label="Dashboard mode"
          className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:w-[640px] xl:shrink-0"
        >
          {modes.map((option) => {
            const selected = mode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange?.(option.value)}
                aria-pressed={selected}
                className="min-w-0 rounded-xl border px-4 py-3 text-left transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{
                  backgroundColor: selected
                    ? option.background
                    : isLight
                      ? "#f8fafc"
                      : "#0f172a",
                  borderColor: selected
                    ? option.border
                    : isLight
                      ? "#cbd5e1"
                      : "#334155",
                  outlineColor: option.border,
                }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: selected
                        ? option.accent
                        : isLight
                          ? "#0f172a"
                          : "#f8fafc",
                    }}
                  >
                    {option.title}
                  </span>

                  {selected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 shrink-0"
                      style={{ color: option.accent }}
                    >
                      <path d="m4 8 2.5 2.5L12 5" />
                    </svg>
                  )}
                </span>

                <span
                  className="mt-1 block text-xs leading-5"
                  style={{
                    color: isLight ? "#526277" : "#94a3b8",
                  }}
                >
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ModuleCarousel({
  modules,
  mode,
  onOpen,
  moduleColors,
  theme,
}) {
  const id = useId();
  const trackRef = useRef(null);

  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const isBasic = mode === "basic";
  const moduleSignature = modules.map((module) => module.id).join(",");

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return undefined;
    }

    const updateScrollState = () => {
      const maxScroll = Math.max(
        0,
        track.scrollWidth - track.clientWidth
      );
      const position = Math.max(0, track.scrollLeft);

      const nextState = {
        canScrollLeft: position > 2,
        canScrollRight: position < maxScroll - 2,
      };

      setScrollState((current) =>
        current.canScrollLeft === nextState.canScrollLeft &&
        current.canScrollRight === nextState.canScrollRight
          ? current
          : nextState
      );
    };

    updateScrollState();
    track.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateScrollState)
        : null;

    resizeObserver?.observe(track);

    Array.from(track.children).forEach((child) => {
      resizeObserver?.observe(child);
    });

    return () => {
      track.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [moduleSignature, mode]);

  const scrollCards = (direction) => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const firstCard = track.querySelector("[data-module-card]");
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap) || 0;

    const distance = firstCard
      ? firstCard.getBoundingClientRect().width + gap
      : track.clientWidth;

    track.scrollBy({
      left: direction * distance,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const focusCard = (index) => {
    const track = trackRef.current;
    const cards = track?.querySelectorAll("[data-module-card]");

    if (!track || !cards?.length) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(index, cards.length - 1));
    const card = cards[safeIndex];
    const button = card.querySelector("[data-module-open]");

    if (button && document.activeElement !== button) {
      button.focus({ preventScroll: true });
    }

    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const padding = 4;

    if (cardRect.left < trackRect.left + padding) {
      track.scrollBy({
        left: cardRect.left - trackRect.left - padding,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    } else if (cardRect.right > trackRect.right - padding) {
      track.scrollBy({
        left: cardRect.right - trackRect.right + padding,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      return;
    }

    const cards = Array.from(
      trackRef.current?.querySelectorAll("[data-module-card]") || []
    );

    if (!cards.length) {
      return;
    }

    const currentIndex = cards.findIndex((card) =>
      card.contains(event.target)
    );

    let nextIndex;

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = cards.length - 1;
    } else if (event.key === "ArrowRight") {
      nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex < 0 ? cards.length - 1 : currentIndex - 1;
    }

    event.preventDefault();
    focusCard(nextIndex);
  };

  const arrowClass =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xl text-slate-300 transition hover:border-cyan-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-roledescription="carousel"
      className={`${isBasic ? "mt-8" : "mt-10"} min-w-0 max-w-full`}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {!isBasic && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              AI Workspace
            </p>
          )}

          <h2
            id={`${id}-title`}
            className={`font-bold text-white ${
              isBasic ? "text-xl" : "mt-1 text-2xl"
            }`}
          >
            {isBasic ? "Choose an AI Tool" : "Your Modules"}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {isBasic
              ? "Pick the tool that best matches what you want to accomplish."
              : "Launch the tools that power your projects."}
          </p>
        </div>

        {modules.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="mr-1 hidden rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 sm:inline-flex">
              {modules.length} active{" "}
              {modules.length === 1 ? "module" : "modules"}
            </span>

            <button
              type="button"
              aria-label="Scroll modules left"
              aria-controls={`${id}-track`}
              disabled={!scrollState.canScrollLeft}
              onClick={() => scrollCards(-1)}
              className={arrowClass}
            >
              <span aria-hidden="true">←</span>
            </button>

            <button
              type="button"
              aria-label="Scroll modules right"
              aria-controls={`${id}-track`}
              disabled={!scrollState.canScrollRight}
              onClick={() => scrollCards(1)}
              className={arrowClass}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>

      {modules.length > 0 ? (
        <>
          <p id={`${id}-help`} className="sr-only">
            Swipe or use the scroll buttons to browse modules.
            Tab through the module buttons, or use Left and Right
            Arrow to move between them. Home selects the first module
            and End selects the last. Press Enter or Space to open
            a module.
          </p>

          <div
            id={`${id}-track`}
            ref={trackRef}
            role="group"
            aria-label="Enabled AI modules"
            aria-describedby={`${id}-help`}
            onKeyDown={handleKeyDown}
            className="flex w-full min-w-0 max-w-full snap-x snap-proximity items-stretch gap-4 overflow-x-auto overscroll-x-contain px-1 pb-4 pt-1 [scroll-padding-inline:4px] [scrollbar-color:rgb(71_85_105)_transparent] [scrollbar-width:thin] sm:gap-5"
          >
            {modules.map((module, index) => {
              const styles = getModuleStyles(
                module.id,
                moduleColors,
                theme
              );

              return (
                <div
                  key={module.id}
                  data-module-card
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${module.name}, ${index + 1} of ${modules.length}`}
                  onFocusCapture={(event) => {
                    if (event.target.matches("[data-module-open]")) {
                      focusCard(index);
                    }
                  }}
                  className="flex w-full min-w-0 shrink-0 snap-start sm:w-[320px] sm:grow sm:basis-[320px] xl:w-[360px] xl:basis-[360px]"
                >
                  {isBasic ? (
                    <button
                      type="button"
                      data-module-open
                      onClick={() => onOpen(module.route)}
                      style={styles.card}
                      className="group flex w-full min-w-0 flex-col rounded-2xl border p-5 text-left transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <span className="flex w-full items-start gap-3">
                        <span
                          aria-hidden="true"
                          style={styles.icon}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl"
                        >
                          {module.icon}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-lg font-bold text-white">
                            {module.name}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-slate-400">
                            {module.subtitle}
                          </span>
                        </span>

                        <span
                          aria-hidden="true"
                          style={styles.subtitle}
                          className="shrink-0 text-lg transition group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </span>

                      <span className="mt-4 flex min-h-6 items-center">
                        {module.beta && <BetaBadge />}
                      </span>
                    </button>
                  ) : (
                    <article
                      style={styles.card}
                      className="group relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border p-5 transition duration-200 hover:shadow-lg sm:p-6"
                    >
                      <div
                        style={styles.glow}
                        className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full blur-3xl"
                      />

                      <div className="relative flex h-full min-w-0 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            aria-hidden="true"
                            style={styles.icon}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl"
                          >
                            {module.icon}
                          </div>

                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </div>

                        <div className="mt-5">
                          <p
                            style={styles.subtitle}
                            className="text-xs font-semibold uppercase tracking-[0.15em]"
                          >
                            {module.subtitle}
                          </p>
                          <h3 className="mt-2 break-words text-2xl font-bold text-white">
                            {module.name}
                          </h3>
                          <div className="mt-2 flex min-h-7 items-center">
                            {module.beta && <BetaBadge />}
                          </div>
                          <p className="mt-3 break-words text-sm leading-6 text-slate-400">
                            {module.description}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {module.features.map((feature) => (
                              <span
                                key={feature}
                                style={styles.feature}
                                className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-auto pt-7">
                          <button
                            type="button"
                            data-module-open
                            onClick={() => onOpen(module.route)}
                            style={styles.button}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4"
                          >
                            {module.buttonLabel}
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
          <p className="font-semibold text-white">
            No AI modules selected
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Choose your modules in Settings to show them here.
          </p>
          <button
            type="button"
            onClick={() => onOpen("/settings")}
            className={`${SECONDARY_BUTTON} mt-4`}
          >
            Open Settings
          </button>
        </div>
      )}
    </section>
  );
}

function Dashboard({
  dashboardMode = "basic",
  onDashboardModeChange,
  selectedModules = [],
  moduleColors = DEFAULT_MODULE_COLORS,
  theme = "dark",
}) {
  const navigate = useNavigate();

  const [dashboardStats, setDashboardStats] = useState({
    project_count: 0,
    ai_usage_count: 0,
    activity_status: "Loading...",
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);

  const [newProjectForm, setNewProjectForm] = useState({
    title: "",
    description: "",
    workspaceId: "",
    projectType: getDefaultProjectType(selectedModules),
  });

  const [projectCreating, setProjectCreating] = useState(false);
  const [projectCreateError, setProjectCreateError] = useState("");
  const [projectCreateSuccess, setProjectCreateSuccess] = useState("");

  const projectRedirectRef = useRef(null);
  const searchBlurRef = useRef(null);
  const projectRequestBusyRef = useRef(false);

  const visibleModules = MODULES.filter((module) =>
    selectedModules.includes(module.id)
  );

  const projectModules = MODULES.filter(
    (module) =>
      PROJECT_MODULE_IDS.includes(module.id) &&
      selectedModules.includes(module.id)
  );

  const canCreateProjects = projectModules.length > 0;
  const isBasic = dashboardMode === "basic";
  const projectFormBusy = projectCreating || Boolean(projectCreateSuccess);

  const quickActions = [
    {
      title: "Projects",
      description: "View and manage your projects.",
      icon: "📁",
      action: () => navigate("/projects"),
    },
    {
      title: "Workspaces",
      description: "Organize projects into workspaces.",
      icon: "🗂️",
      action: () => navigate("/workspaces"),
    },
    {
      title: "Content Library",
      description: "Browse your saved AI-generated content.",
      icon: "📄",
      action: () => navigate("/content"),
    },
  ];

  const searchItems = [
    ...visibleModules.map((module) => ({
      title: module.name,
      description: module.subtitle,
      icon: module.icon,
      action: () => navigate(module.route),
    })),
    ...quickActions,
  ];

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const searchResults = normalizedSearchQuery
    ? searchItems.filter((item) =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes(normalizedSearchQuery)
      )
    : [];

  useEffect(() => {
    return () => {
      window.clearTimeout(projectRedirectRef.current);
      window.clearTimeout(searchBlurRef.current);
    };
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    if (searchResults.length > 0) {
      searchResults[0].action();
      setSearchQuery("");
      setSearchFocused(false);
    }
  };

  const scrollToRecentActivity = () => {
    document.getElementById("recent-activity")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  const loadDashboardStats = async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setStatsLoading(true);
    }

    setStatsError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(`${API_URL}/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getRequestError(data, "Dashboard statistics could not be loaded.")
        );
      }

      if (!data || typeof data !== "object") {
        throw new Error("Dashboard statistics could not be loaded.");
      }

      setDashboardStats({
        project_count: data.project_count ?? 0,
        ai_usage_count: data.ai_usage_count ?? 0,
        activity_status: data.activity_status || "Inactive",
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      setStatsError(
        error instanceof Error
          ? error.message
          : "Dashboard statistics could not be loaded."
      );
    } finally {
      if (showLoading) {
        setStatsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadWorkspaces = async () => {
    setWorkspacesLoading(true);
    setProjectCreateError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(`${API_URL}/workspaces/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getRequestError(data, "Workspaces could not be loaded.")
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Workspaces could not be loaded.");
      }

      setWorkspaces(data);

      if (data.length > 0) {
        setNewProjectForm((previous) => ({
          ...previous,
          workspaceId: previous.workspaceId || String(data[0].id),
        }));
      }
    } catch (error) {
      console.error("Workspace load error:", error);
      setProjectCreateError(
        error instanceof Error
          ? error.message
          : "Workspaces could not be loaded."
      );
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const resetProjectForm = () => {
    setNewProjectForm({
      title: "",
      description: "",
      workspaceId: "",
      projectType: getDefaultProjectType(selectedModules),
    });
    setProjectCreateError("");
    setProjectCreateSuccess("");
  };

  const handleOpenNewProject = async () => {
    if (!canCreateProjects) {
      return;
    }

    resetProjectForm();
    setWorkspaces([]);
    setNewProjectOpen(true);
    await loadWorkspaces();
  };

  const handleCloseNewProject = () => {
    if (projectRequestBusyRef.current || projectFormBusy) {
      return;
    }

    setNewProjectOpen(false);
    resetProjectForm();
  };

  const updateProjectForm = (key, value) => {
    setNewProjectForm((previous) => ({
      ...previous,
      [key]: value,
    }));
    setProjectCreateError("");
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (
      projectRequestBusyRef.current ||
      projectCreating ||
      projectCreateSuccess
    ) {
      return;
    }

    const cleanedTitle = newProjectForm.title.trim();
    const cleanedDescription = newProjectForm.description.trim();

    if (cleanedTitle.length < 2 || cleanedTitle.length > 100) {
      setProjectCreateError(
        "Project name must contain between 2 and 100 characters."
      );
      return;
    }

    if (
      cleanedDescription.length < 10 ||
      cleanedDescription.length > 5000
    ) {
      setProjectCreateError(
        "Project description must contain between 10 and 5,000 characters."
      );
      return;
    }

    const workspaceExists = workspaces.some(
      (workspace) => String(workspace.id) === newProjectForm.workspaceId
    );

    if (!workspaceExists) {
      setProjectCreateError("Please choose a workspace.");
      return;
    }

    if (
      !PROJECT_MODULE_IDS.includes(newProjectForm.projectType) ||
      !selectedModules.includes(newProjectForm.projectType)
    ) {
      setProjectCreateError("Please choose a project type.");
      return;
    }

    const selectedProjectType = newProjectForm.projectType;

    projectRequestBusyRef.current = true;
    setProjectCreating(true);
    setProjectCreateError("");
    setProjectCreateSuccess("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(`${API_URL}/projects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: cleanedTitle,
          description: cleanedDescription,
          workspace_id: Number(newProjectForm.workspaceId),
        }),
      });

      const createdProject = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getRequestError(createdProject, "Project could not be created.")
        );
      }

      if (!createdProject || typeof createdProject !== "object") {
        throw new Error("The server did not return the created project.");
      }

      try {
        notifyProjectCreated(cleanedTitle);
      } catch (error) {
        console.error("Project notification failed:", error);
      }

      setProjectCreateSuccess(
        `"${cleanedTitle}" was created successfully. Opening your module...`
      );

      await loadDashboardStats({ showLoading: false });
      setActivityRefreshKey((previous) => previous + 1);

      const destination =
        selectedProjectType === "tabletop-creator"
          ? "/tabletop-creator"
          : "/product-architect";

      projectRedirectRef.current = window.setTimeout(() => {
        setNewProjectOpen(false);
        resetProjectForm();
        navigate(destination, {
          state: {
            project: createdProject,
          },
        });
      }, 700);
    } catch (error) {
      console.error("Project creation error:", error);
      setProjectCreateError(
        error instanceof Error
          ? error.message
          : "Project could not be created."
      );
    } finally {
      projectRequestBusyRef.current = false;
      setProjectCreating(false);
    }
  };

  const handleDashboardRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadDashboardStats({ showLoading: false });
      setActivityRefreshKey((previous) => previous + 1);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="w-full min-w-0 max-w-full flex-1 bg-slate-950/30 p-4 sm:p-6 md:p-8 lg:p-10">
      <DashboardViewSelector
        mode={dashboardMode}
        onChange={onDashboardModeChange}
        theme={theme}
      />

      <section className="relative min-w-0 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-black/10 sm:p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          {!isBasic && (
            <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
          )}
        </div>

        <div className="relative flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-500">
                Tanio AI
              </span>

              {!isBasic && (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  All systems ready
                </span>
              )}
            </div>

            <h1 className="mt-5 break-words text-3xl font-bold tracking-tight text-white md:text-4xl">
              {isBasic
                ? "What would you like to create?"
                : "Everything you need to build with AI."}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
              {isBasic
                ? "Start a new project or choose one of Tanio's AI tools below."
                : "Create projects, launch modules, and keep track of your latest work from one place."}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row xl:w-auto">
            {!isBasic && (
              <div
                className="relative w-full min-w-0 sm:flex-1 xl:w-[300px] xl:flex-none"
                onFocusCapture={() => {
                  window.clearTimeout(searchBlurRef.current);
                  setSearchFocused(true);
                }}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    searchBlurRef.current = window.setTimeout(
                      () => setSearchFocused(false),
                      120
                    );
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchFocused(false);
                  }
                }}
              >
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    >
                      ⌕
                    </span>

                    <input
                      type="search"
                      aria-label="Search Tanio"
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(event.target.value)
                      }
                      placeholder="Search Tanio..."
                      className="w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950/85 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                    />
                  </div>
                </form>

                {searchFocused && normalizedSearchQuery && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button
                          key={`${item.title}-${item.description}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            item.action();
                            setSearchQuery("");
                            setSearchFocused(false);
                          }}
                          className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400"
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-lg"
                          >
                            {item.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-white">
                              {item.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-400">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-4 text-sm text-slate-400">
                        No results found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {canCreateProjects && (
              <button
                type="button"
                onClick={handleOpenNewProject}
                className={`${PRIMARY_BUTTON} shrink-0`}
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  +
                </span>
                New Project
              </button>
            )}
          </div>
        </div>
      </section>

      {!isBasic && (
        <>
          <section className="mt-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate("/projects")}
              className="group min-w-0 rounded-2xl border border-slate-800 bg-slate-900/85 p-5 text-left transition hover:border-cyan-800 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-xl"
                  >
                    📁
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-300">
                      Projects
                    </p>
                    <p className="mt-1 break-words text-3xl font-bold text-white">
                      {statsLoading ? "..." : dashboardStats.project_count}
                    </p>
                  </div>
                </div>
                <span aria-hidden="true" className="text-slate-500">
                  →
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                View and manage your active work.
              </p>
            </button>

            <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/85 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-xl"
                  >
                    ✦
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-300">
                      AI Generations
                    </p>
                    <p className="mt-1 break-words text-3xl font-bold text-white">
                      {statsLoading ? "..." : dashboardStats.ai_usage_count}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-500">
                  Live
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Successful AI generations across Tanio.
              </p>
            </div>

            <button
              type="button"
              onClick={scrollToRecentActivity}
              className="group min-w-0 rounded-2xl border border-slate-800 bg-slate-900/85 p-5 text-left transition hover:border-emerald-800 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10"
                  >
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-300">
                      Activity
                    </p>
                    <p className="mt-1 break-words text-3xl font-bold text-white">
                      {statsLoading ? "..." : dashboardStats.activity_status}
                    </p>
                  </div>
                </div>
                <span aria-hidden="true" className="text-slate-500">
                  ↓
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Jump to your latest Tanio activity.
              </p>
            </button>
          </section>

          {statsError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
            >
              <p className="font-semibold text-amber-500">
                Dashboard stats could not be loaded
              </p>
              <p className="mt-1 text-sm text-slate-400">{statsError}</p>
            </div>
          )}
        </>
      )}

      <ModuleCarousel
        key={dashboardMode}
        modules={visibleModules}
        mode={dashboardMode}
        moduleColors={moduleColors}
        theme={theme}
        onOpen={(route) => navigate(route)}
      />

      <section className={`${isBasic ? "mt-8" : "mt-10"} min-w-0`}>
        {!isBasic && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Shortcuts
          </p>
        )}
        <h2 className="mb-4 mt-1 text-xl font-bold text-white">
          {isBasic ? "Your Work" : "Quick Actions"}
        </h2>

        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={action.action}
              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-left transition hover:border-cyan-800 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-lg"
              >
                {action.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-white">
                  {action.title}
                </span>
                {!isBasic && (
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {action.description}
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-500"
              >
                →
              </span>
            </button>
          ))}
        </div>
      </section>

      {!isBasic && (
        <div id="recent-activity" className="min-w-0 scroll-mt-24">
          <RecentContent
            refreshKey={activityRefreshKey}
            onRefresh={handleDashboardRefresh}
            refreshing={refreshing}
          />
        </div>
      )}

      {newProjectOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[92vh] w-full min-w-0 max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/50 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-500">
                  New Project
                </p>
                <h2
                  id="new-project-title"
                  className="mt-1 text-2xl font-bold text-white"
                >
                  Create & launch your project
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Choose where the project belongs and which Tanio
                  module you want to open after creation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseNewProject}
                disabled={projectFormBusy}
                aria-label="Close create project dialog"
                className="shrink-0 rounded-lg px-3 py-1.5 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {workspacesLoading ? (
              <div
                role="status"
                className="mt-8 flex items-center justify-center gap-3 py-8 text-slate-400"
              >
                <div
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400"
                />
                Loading workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                <p className="font-semibold text-amber-500">
                  {projectCreateError
                    ? "Workspaces could not be loaded"
                    : "You need a workspace first"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {projectCreateError ||
                    "Projects must belong to a workspace. Create one before starting your project."}
                </p>

                {projectCreateError ? (
                  <button
                    type="button"
                    onClick={loadWorkspaces}
                    className={`${SECONDARY_BUTTON} mt-4`}
                  >
                    Retry
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNewProjectOpen(false);
                      navigate("/workspaces");
                    }}
                    className={`${PRIMARY_BUTTON} mt-4`}
                  >
                    Go to Workspaces
                  </button>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleCreateProject}
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="dashboard-project-name"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Project Name
                  </label>
                  <input
                    id="dashboard-project-name"
                    type="text"
                    value={newProjectForm.title}
                    onChange={(event) =>
                      updateProjectForm("title", event.target.value)
                    }
                    maxLength={100}
                    disabled={projectFormBusy}
                    placeholder="e.g. Tanio AI"
                    className={FIELD_CLASS}
                  />
                </div>

                <div>
                  <label
                    htmlFor="dashboard-project-description"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Description
                  </label>
                  <textarea
                    id="dashboard-project-description"
                    value={newProjectForm.description}
                    onChange={(event) =>
                      updateProjectForm("description", event.target.value)
                    }
                    rows={4}
                    maxLength={5000}
                    disabled={projectFormBusy}
                    placeholder="Describe what you're building..."
                    className={`${FIELD_CLASS} resize-y`}
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">
                    {newProjectForm.description.length}/5000
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="dashboard-project-workspace"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Workspace
                  </label>
                  <select
                    id="dashboard-project-workspace"
                    value={newProjectForm.workspaceId}
                    onChange={(event) =>
                      updateProjectForm("workspaceId", event.target.value)
                    }
                    disabled={projectFormBusy}
                    className={FIELD_CLASS}
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-300">
                    Project Type
                  </p>
                  <div
                    role="group"
                    aria-label="Project type"
                    className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    {projectModules.map((module) => {
                      const styles = getModuleStyles(
                        module.id,
                        moduleColors,
                        theme
                      );
                      const selected =
                        newProjectForm.projectType === module.id;

                      return (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() =>
                            updateProjectForm("projectType", module.id)
                          }
                          disabled={projectFormBusy}
                          aria-pressed={selected}
                          style={
                            selected
                              ? styles.selectedCard
                              : styles.unselectedCard
                          }
                          className="min-w-0 rounded-xl border p-4 text-left transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="flex items-start gap-3">
                            <span
                              aria-hidden="true"
                              style={styles.icon}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xl"
                            >
                              {module.icon}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-semibold text-white">
                                {module.name}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                                {module.description}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Tanio will open the selected module automatically
                    after the project is created.
                  </p>
                </div>

                {projectCreateError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
                  >
                    <p className="text-sm text-red-500">
                      {projectCreateError}
                    </p>
                  </div>
                )}

                {projectCreateSuccess && (
                  <div
                    role="status"
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                  >
                    <p className="text-sm text-emerald-500">
                      {projectCreateSuccess}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseNewProject}
                    disabled={projectFormBusy}
                    className={SECONDARY_BUTTON}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={projectFormBusy}
                    className={PRIMARY_BUTTON}
                  >
                    {projectCreating
                      ? "Creating..."
                      : projectCreateSuccess
                        ? "Opening..."
                        : "Create & Open"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default Dashboard;