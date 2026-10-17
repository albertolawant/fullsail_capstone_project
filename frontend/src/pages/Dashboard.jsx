import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import RecentContent from "../components/RecentContent";
import { notifyProjectCreated } from "../utils/notifications";

const PROJECT_MODULE_IDS = ["product-architect", "tabletop-creator"];

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
    accent: "cyan",
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
    accent: "purple",
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
    accent: "emerald",
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
    accent: "cyan",
    beta: true,
    features: ["Lessons", "Flashcards", "Quizzes"],
  },
];

const ACCENT_CLASSES = {
  cyan: {
    card: "border-cyan-900/80 bg-gradient-to-br from-cyan-950/35 via-slate-900 to-slate-900 hover:border-cyan-600",
    basic: "hover:border-cyan-700",
    glow: "bg-cyan-400/10",
    icon: "border-cyan-800 bg-cyan-950/80",
    subtitle: "text-cyan-400",
    feature: "border-cyan-900/80 bg-cyan-950/30 text-cyan-200",
    button: "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
    arrow: "group-hover:text-cyan-400",
  },
  purple: {
    card: "border-purple-900/80 bg-gradient-to-br from-purple-950/35 via-slate-900 to-slate-900 hover:border-purple-600",
    basic: "hover:border-purple-700",
    glow: "bg-purple-400/10",
    icon: "border-purple-800 bg-purple-950/80",
    subtitle: "text-purple-400",
    feature: "border-purple-900/80 bg-purple-950/30 text-purple-200",
    button: "bg-purple-600 text-white hover:bg-purple-500",
    arrow: "group-hover:text-purple-400",
  },
  emerald: {
    card: "border-emerald-900/80 bg-gradient-to-br from-emerald-950/35 via-slate-900 to-slate-900 hover:border-emerald-600",
    basic: "hover:border-emerald-700",
    glow: "bg-emerald-400/10",
    icon: "border-emerald-800 bg-emerald-950/80",
    subtitle: "text-emerald-400",
    feature: "border-emerald-900/80 bg-emerald-950/30 text-emerald-200",
    button: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
    arrow: "group-hover:text-emerald-400",
  },
};

const FIELD_CLASS =
  "w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50";

const SECONDARY_BUTTON =
  "rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

function getDefaultProjectType(selectedModules) {
  return (
    PROJECT_MODULE_IDS.find((moduleId) =>
      selectedModules.includes(moduleId)
    ) || ""
  );
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function ModuleCarousel({ modules, mode, onOpen }) {
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

    track.addEventListener("scroll", updateScrollState, {
      passive: true,
    });
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

    button?.focus({ preventScroll: true });

    // Scroll only the carousel, leaving the page's vertical position alone.
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
      event.shiftKey
    ) {
      return;
    }

    if (
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      return;
    }

    const track = trackRef.current;
    const cards = Array.from(
      track?.querySelectorAll("[data-module-card]") || []
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
      nextIndex =
        currentIndex < 0 ? cards.length - 1 : currentIndex - 1;
    }

    event.preventDefault();
    focusCard(nextIndex);
  };

  const handleCardFocus = (event, index) => {
    if (event.target.matches("[data-module-open]")) {
      focusCard(index);
    }
  };

  const arrowClass =
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xl text-slate-200 transition hover:border-cyan-600 hover:bg-slate-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:bg-slate-900 disabled:hover:text-slate-200";

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
            Tab through the module buttons, or use Left and Right Arrow
            to move between them. Home selects the first module and
            End selects the last. Press Enter or Space to open a module.
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
              const accent =
                ACCENT_CLASSES[module.accent] || ACCENT_CLASSES.cyan;

              return (
                <div
                  key={module.id}
                  data-module-card
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${module.name}, ${index + 1} of ${modules.length}`}
                  onFocusCapture={(event) =>
                    handleCardFocus(event, index)
                  }
                  className="flex w-full min-w-0 shrink-0 snap-start sm:w-[320px] sm:grow sm:basis-[320px] xl:w-[360px] xl:basis-[360px]"
                >
                  {isBasic ? (
                    <button
                      type="button"
                      data-module-open
                      onClick={() => onOpen(module.route)}
                      className={`group flex w-full min-w-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-left transition hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${accent.basic}`}
                    >
                      <span className="flex w-full items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl ${accent.icon}`}
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
                          className={`shrink-0 text-lg text-slate-600 transition group-hover:translate-x-1 ${accent.arrow}`}
                        >
                          →
                        </span>
                      </span>

                      <span className="mt-4 flex min-h-6 items-center">
                        {module.beta && (
                          <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Beta
                          </span>
                        )}
                      </span>
                    </button>
                  ) : (
                    <article
                      className={`group relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border p-5 transition duration-200 sm:p-6 ${accent.card}`}
                    >
                      <div
                        className={`pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full blur-3xl ${accent.glow}`}
                      />

                      <div className="relative flex h-full min-w-0 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            aria-hidden="true"
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl ${accent.icon}`}
                          >
                            {module.icon}
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/80 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        </div>

                        <div className="mt-5">
                          <p
                            className={`text-xs font-semibold uppercase tracking-[0.15em] ${accent.subtitle}`}
                          >
                            {module.subtitle}
                          </p>
                          <h3 className="mt-2 break-words text-2xl font-bold text-white">
                            {module.name}
                          </h3>

                          <div className="mt-2 flex min-h-7 items-center">
                            {module.beta && (
                              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                                Beta
                              </span>
                            )}
                          </div>

                          <p className="mt-3 break-words text-sm leading-6 text-slate-400">
                            {module.description}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {module.features.map((feature) => (
                              <span
                                key={feature}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${accent.feature}`}
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
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${accent.button}`}
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
    return () => window.clearTimeout(projectRedirectRef.current);
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
    document
      .getElementById("recent-activity")
      ?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
  };

  const getToken = () => localStorage.getItem("token");

  const loadDashboardStats = async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setStatsLoading(true);
    }

    setStatsError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/dashboard/stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Dashboard statistics could not be loaded."
        );
      }

      const data = await response.json();

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
      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/workspaces/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Workspaces could not be loaded."
        );
      }

      const data = await response.json();
      const workspaceList = Array.isArray(data) ? data : [];

      setWorkspaces(workspaceList);

      if (workspaceList.length > 0) {
        setNewProjectForm((previous) => ({
          ...previous,
          workspaceId:
            previous.workspaceId || String(workspaceList[0].id),
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
    if (projectCreating || projectCreateSuccess) {
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

    if (projectCreating || projectCreateSuccess) {
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

    if (!newProjectForm.workspaceId) {
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

    setProjectCreating(true);
    setProjectCreateError("");
    setProjectCreateSuccess("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/projects/",
        {
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let message = "Project could not be created.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (Array.isArray(errorData?.detail)) {
          message = errorData.detail
            .map((item) => item.msg)
            .filter(Boolean)
            .join(" ");
        }

        throw new Error(message);
      }

      const createdProject = await response.json();

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
          state: { project: createdProject },
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

  const projectFormBusy = projectCreating || Boolean(projectCreateSuccess);

  return (
    <main className="w-full min-w-0 max-w-full flex-1 bg-slate-950/30 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="mb-6 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dashboard View
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Choose the experience that best matches how you want to work.
          </p>
        </div>

        <div
          className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:max-w-2xl"
          role="group"
          aria-label="Dashboard mode"
        >
          {[
            {
              value: "basic",
              title: "Basic Mode",
              description:
                "A simplified workspace with essential tools and navigation for a focused experience.",
              active:
                "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-950/20",
              text: "text-cyan-300",
            },
            {
              value: "advanced",
              title: "Advanced Mode",
              description:
                "The complete dashboard with statistics, search, shortcuts, and recent activity.",
              active:
                "border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-950/20",
              text: "text-purple-300",
            },
          ].map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onDashboardModeChange?.(mode.value)}
              aria-pressed={dashboardMode === mode.value}
              className={`min-w-0 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                dashboardMode === mode.value
                  ? mode.active
                  : "border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  dashboardMode === mode.value ? mode.text : "text-white"
                }`}
              >
                {mode.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">
                {mode.description}
              </span>
            </button>
          ))}
        </div>
      </div>

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
              <span className="rounded-full border border-cyan-800/80 bg-cyan-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Tanio AI
              </span>
              {!isBasic && (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
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
              <div className="relative w-full min-w-0 sm:flex-1 xl:w-[300px] xl:flex-none">
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
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => {
                        window.setTimeout(
                          () => setSearchFocused(false),
                          120
                        );
                      }}
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
                          className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-800"
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
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
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
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-900 bg-cyan-950/60 text-xl"
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
                <span aria-hidden="true" className="text-slate-600">
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
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-900 bg-purple-950/60 text-xl"
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
                <span className="rounded-full border border-purple-900/80 bg-purple-950/40 px-2.5 py-1 text-[11px] font-semibold text-purple-300">
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
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-900 bg-emerald-950/60"
                  >
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
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
                <span aria-hidden="true" className="text-slate-600">
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
              className="mt-4 rounded-xl border border-amber-800/80 bg-amber-950/30 p-4"
            >
              <p className="font-semibold text-amber-300">
                Dashboard stats could not be loaded
              </p>
              <p className="mt-1 text-sm text-amber-200/80">
                {statsError}
              </p>
            </div>
          )}
        </>
      )}

      <ModuleCarousel
        key={dashboardMode}
        modules={visibleModules}
        mode={dashboardMode}
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
                className="shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400"
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                  New Project
                </p>
                <h2
                  id="new-project-title"
                  className="mt-1 text-2xl font-bold text-white"
                >
                  Create & launch your project
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Choose where the project belongs and which Tanio module
                  you want to open after creation.
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
              <div className="mt-6 rounded-xl border border-amber-800 bg-amber-950/30 p-5">
                <p className="font-semibold text-amber-300">
                  {projectCreateError
                    ? "Workspaces could not be loaded"
                    : "You need a workspace first"}
                </p>
                <p className="mt-2 text-sm text-amber-200/80">
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
                    className="mt-4 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white transition hover:bg-amber-600"
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
                      const accent =
                        ACCENT_CLASSES[module.accent] ||
                        ACCENT_CLASSES.cyan;
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
                          className={`min-w-0 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                            selected
                              ? accent.card
                              : `border-slate-700 bg-slate-950/60 ${accent.basic}`
                          }`}
                        >
                          <span className="flex items-start gap-3">
                            <span
                              aria-hidden="true"
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xl ${accent.icon}`}
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
                    className="rounded-xl border border-red-800 bg-red-950/40 p-4"
                  >
                    <p className="text-sm text-red-300">
                      {projectCreateError}
                    </p>
                  </div>
                )}

                {projectCreateSuccess && (
                  <div
                    role="status"
                    className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4"
                  >
                    <p className="text-sm text-emerald-300">
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
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
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