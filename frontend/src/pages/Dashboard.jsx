import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import RecentContent from "../components/RecentContent";

function Dashboard() {
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
    projectType: "product-architect",
  });

  const [projectCreating, setProjectCreating] = useState(false);
  const [projectCreateError, setProjectCreateError] = useState("");
  const [projectCreateSuccess, setProjectCreateSuccess] = useState("");

  const modules = [
    {
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
  ];

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
    ...modules.map((module) => ({
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
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const loadDashboardStats = async ({
    showLoading = true,
  } = {}) => {
    if (showLoading) {
      setStatsLoading(true);
    }

    setStatsError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "http://127.0.0.1:8000/dashboard/stats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "http://127.0.0.1:8000/workspaces/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
            previous.workspaceId ||
            String(workspaceList[0].id),
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

  const handleOpenNewProject = async () => {
    setNewProjectForm({
      title: "",
      description: "",
      workspaceId: "",
      projectType: "product-architect",
    });

    setProjectCreateError("");
    setProjectCreateSuccess("");
    setNewProjectOpen(true);

    await loadWorkspaces();
  };

  const handleCloseNewProject = () => {
    if (projectCreating) {
      return;
    }

    setNewProjectOpen(false);

    setNewProjectForm({
      title: "",
      description: "",
      workspaceId: "",
      projectType: "product-architect",
    });

    setProjectCreateError("");
    setProjectCreateSuccess("");
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();

    const cleanedTitle = newProjectForm.title.trim();
    const cleanedDescription =
      newProjectForm.description.trim();

    if (cleanedTitle.length < 2) {
      setProjectCreateError(
        "Project name must be at least 2 characters."
      );
      return;
    }

    if (cleanedDescription.length < 10) {
      setProjectCreateError(
        "Project description must be at least 10 characters."
      );
      return;
    }

    if (!newProjectForm.workspaceId) {
      setProjectCreateError("Please choose a workspace.");
      return;
    }

    if (
      newProjectForm.projectType !== "product-architect" &&
      newProjectForm.projectType !== "tabletop-creator"
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
        throw new Error(
          "Your session has expired. Please sign in again."
        );
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
            workspace_id: Number(
              newProjectForm.workspaceId
            ),
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

      setProjectCreateSuccess(
        `"${cleanedTitle}" was created successfully. Opening your module...`
      );

      await loadDashboardStats({
        showLoading: false,
      });

      setActivityRefreshKey((previous) => previous + 1);

      const destination =
        selectedProjectType === "tabletop-creator"
          ? "/tabletop-creator"
          : "/product-architect";

      setTimeout(() => {
        setNewProjectOpen(false);

        setNewProjectForm({
          title: "",
          description: "",
          workspaceId: "",
          projectType: "product-architect",
        });

        setProjectCreateSuccess("");

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
      setProjectCreating(false);
    }
  };

  const handleDashboardRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadDashboardStats({
        showLoading: false,
      });

      setActivityRefreshKey((previous) => previous + 1);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="flex-1 bg-slate-950/30 p-6 md:p-8 lg:p-10">
      {/* Hero / Command Area */}
      <section className="relative rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/10 md:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cyan-800/80 bg-cyan-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Tanio AI
                </span>

                <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/40" />
                  All systems ready
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.8rem]">
                Everything you need to build with AI.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                Create projects, launch modules, and keep track of your latest work
                from one place.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <div className="relative w-full sm:min-w-[300px] xl:w-[340px]">
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      aria-hidden="true"
                    >
                      ⌕
                    </span>

                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => {
                        window.setTimeout(() => setSearchFocused(false), 120);
                      }}
                      placeholder="Search Tanio..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/85 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
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
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-lg">
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
                      <div className="px-4 py-4 text-sm text-slate-400">
                        No results found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenNewProject}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:bg-cyan-400"
              >
                <span className="text-lg leading-none">+</span>
                New Project
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="group rounded-2xl border border-slate-800 bg-slate-900/85 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-800 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-900 bg-cyan-950/60 text-xl">
                📁
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-300">
                  Projects
                </p>

                <p className="mt-1 text-3xl font-bold text-white">
                  {statsLoading ? "..." : dashboardStats.project_count}
                </p>
              </div>
            </div>

            <span className="text-sm text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400">
              →
            </span>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            View and manage your active work.
          </p>
        </button>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-900 bg-purple-950/60 text-xl">
                ✦
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-300">
                  AI Generations
                </p>

                <p className="mt-1 text-3xl font-bold text-white">
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
          className="group rounded-2xl border border-slate-800 bg-slate-900/85 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-800 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-900 bg-emerald-950/60">
                <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/40" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-300">
                  Activity
                </p>

                <p className="mt-1 text-3xl font-bold text-white">
                  {statsLoading ? "..." : dashboardStats.activity_status}
                </p>
              </div>
            </div>

            <span className="text-sm text-slate-600 transition group-hover:text-emerald-400">
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
          className="mt-4 rounded-xl border border-amber-800/80 bg-amber-950/30 p-4"
          role="alert"
        >
          <p className="font-semibold text-amber-300">
            Dashboard stats could not be loaded
          </p>
          <p className="mt-1 text-sm text-amber-200/80">{statsError}</p>
        </div>
      )}

      {/* Modules */}
      <section className="mt-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              AI Workspace
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">Your Modules</h2>
            <p className="mt-1 text-sm text-slate-400">
              Launch the tools that power your projects.
            </p>
          </div>

          <span className="inline-flex items-center gap-2 self-start rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {modules.length} active modules
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {modules.map((module) => {
            const isCyan = module.accent === "cyan";

            return (
              <article
                key={module.name}
                className={`group relative overflow-hidden rounded-2xl border p-6 transition duration-200 hover:-translate-y-1 ${
                  isCyan
                    ? "border-cyan-900/80 bg-gradient-to-br from-cyan-950/35 via-slate-900 to-slate-900 hover:border-cyan-600 hover:shadow-2xl hover:shadow-cyan-950/30"
                    : "border-purple-900/80 bg-gradient-to-br from-purple-950/35 via-slate-900 to-slate-900 hover:border-purple-600 hover:shadow-2xl hover:shadow-purple-950/30"
                }`}
              >
                <div
                  className={`pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full blur-3xl ${
                    isCyan ? "bg-cyan-400/10" : "bg-purple-400/10"
                  }`}
                />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border text-2xl ${
                        isCyan
                          ? "border-cyan-800 bg-cyan-950/80"
                          : "border-purple-800 bg-purple-950/80"
                      }`}
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
                      className={`text-xs font-semibold uppercase tracking-[0.15em] ${
                        isCyan ? "text-cyan-400" : "text-purple-400"
                      }`}
                    >
                      {module.subtitle}
                    </p>

                    <h3 className="mt-1 text-2xl font-bold text-white">
                      {module.name}
                    </h3>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                      {module.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {module.features.map((feature) => (
                        <span
                          key={feature}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            isCyan
                              ? "border-cyan-900/80 bg-cyan-950/30 text-cyan-200"
                              : "border-purple-900/80 bg-purple-950/30 text-purple-200"
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7">
                    <button
                      type="button"
                      onClick={() => navigate(module.route)}
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition ${
                        isCyan
                          ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                          : "bg-purple-600 text-white hover:bg-purple-500"
                      }`}
                    >
                      {module.buttonLabel}
                      <span
                        className="transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mt-10">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Shortcuts
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Quick Actions
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Jump to the parts of Tanio you use most.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {quickActions.map((action, index) => {
            const accentClasses = [
              {
                icon: "border-cyan-900 bg-cyan-950/60",
                hover: "hover:border-cyan-800",
                arrow: "group-hover:text-cyan-400",
              },
              {
                icon: "border-blue-900 bg-blue-950/60",
                hover: "hover:border-blue-800",
                arrow: "group-hover:text-blue-400",
              },
              {
                icon: "border-purple-900 bg-purple-950/60",
                hover: "hover:border-purple-800",
                arrow: "group-hover:text-purple-400",
              },
            ][index] || {
              icon: "border-slate-700 bg-slate-950",
              hover: "hover:border-slate-700",
              arrow: "group-hover:text-cyan-400",
            };

            return (
              <button
                key={action.title}
                type="button"
                onClick={action.action}
                className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-left transition hover:-translate-y-0.5 hover:bg-slate-900 ${accentClasses.hover}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg ${accentClasses.icon}`}
                  >
                    {action.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white">
                      {action.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {action.description}
                    </p>
                  </div>

                  <span
                    className={`text-lg text-slate-600 transition group-hover:translate-x-1 ${accentClasses.arrow}`}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <div id="recent-activity" className="scroll-mt-24">
        <RecentContent
          refreshKey={activityRefreshKey}
          onRefresh={handleDashboardRefresh}
          refreshing={refreshing}
        />
      </div>

      {/* New Project Modal */}
      {newProjectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
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
                  Choose where the project belongs and which Tanio module you want
                  to open after creation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseNewProject}
                disabled={projectCreating}
                className="rounded-lg px-3 py-1.5 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close create project dialog"
              >
                ×
              </button>
            </div>

            {workspacesLoading ? (
              <div className="mt-8 flex items-center justify-center gap-3 py-8 text-slate-400">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
                Loading workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="mt-6 rounded-xl border border-amber-800 bg-amber-950/30 p-5">
                <p className="font-semibold text-amber-300">
                  You need a workspace first
                </p>

                <p className="mt-2 text-sm text-amber-200/80">
                  Projects must belong to a workspace. Create one before starting
                  your project.
                </p>

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
              </div>
            ) : (
              <form onSubmit={handleCreateProject} className="mt-6 space-y-5">
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
                    onChange={(event) => {
                      setNewProjectForm((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }));
                      setProjectCreateError("");
                    }}
                    maxLength={100}
                    disabled={projectCreating}
                    placeholder="e.g. Tanio AI"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/10 disabled:opacity-50"
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
                    onChange={(event) => {
                      setNewProjectForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }));
                      setProjectCreateError("");
                    }}
                    rows="4"
                    maxLength={5000}
                    disabled={projectCreating}
                    placeholder="Describe what you're building..."
                    className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/10 disabled:opacity-50"
                  />

                  <div className="mt-1 text-right text-xs text-slate-500">
                    {newProjectForm.description.length}/5000
                  </div>
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
                    onChange={(event) => {
                      setNewProjectForm((previous) => ({
                        ...previous,
                        workspaceId: event.target.value,
                      }));
                      setProjectCreateError("");
                    }}
                    disabled={projectCreating}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/10 disabled:opacity-50"
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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewProjectForm((previous) => ({
                          ...previous,
                          projectType: "product-architect",
                        }));
                        setProjectCreateError("");
                      }}
                      disabled={projectCreating}
                      className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        newProjectForm.projectType === "product-architect"
                          ? "border-cyan-500 bg-cyan-950/40 shadow-lg shadow-cyan-950/20"
                          : "border-slate-700 bg-slate-950/60 hover:border-cyan-800 hover:bg-slate-950"
                      }`}
                      aria-pressed={
                        newProjectForm.projectType === "product-architect"
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-800 bg-cyan-950 text-xl">
                          ⚡
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            Product Architect
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            Plan products, generate documents, and build product
                            strategy with AI.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewProjectForm((previous) => ({
                          ...previous,
                          projectType: "tabletop-creator",
                        }));
                        setProjectCreateError("");
                      }}
                      disabled={projectCreating}
                      className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        newProjectForm.projectType === "tabletop-creator"
                          ? "border-purple-500 bg-purple-950/40 shadow-lg shadow-purple-950/20"
                          : "border-slate-700 bg-slate-950/60 hover:border-purple-800 hover:bg-slate-950"
                      }`}
                      aria-pressed={
                        newProjectForm.projectType === "tabletop-creator"
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-purple-800 bg-purple-950 text-xl">
                          🎲
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            Tabletop Creator
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            Build campaigns, NPCs, quests, encounters, and
                            locations with AI.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Tanio will open the selected module automatically after the
                    project is created.
                  </p>
                </div>

                {projectCreateError && (
                  <div
                    className="rounded-xl border border-red-800 bg-red-950/40 p-4"
                    role="alert"
                  >
                    <p className="text-sm text-red-300">{projectCreateError}</p>
                  </div>
                )}

                {projectCreateSuccess && (
                  <div
                    className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4"
                    role="status"
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
                    disabled={projectCreating}
                    className="rounded-xl bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={projectCreating}
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {projectCreating ? "Creating..." : "Create & Open"}
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