import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBrain,
  FaBolt,
  FaDiceD20,
  FaExclamationTriangle,
  FaFileAlt,
  FaFolderOpen,
  FaImage,
  FaLayerGroup,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaEye,
} from "react-icons/fa";

const API_BASE_URL = "http://127.0.0.1:8000";

function createPreview(body = "", maximumLength = 220) {
  const plainText = body
    .replace(/[#*_>`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    return "No preview is available for this content.";
  }

  if (plainText.length <= maximumLength) {
    return plainText;
  }

  return `${plainText.slice(0, maximumLength).trim()}...`;
}

function sortNewestFirst(items = []) {
  return [...items].sort((firstItem, secondItem) => {
    const firstDate = new Date(
      firstItem.created_at || firstItem.createdAt || 0
    );

    const secondDate = new Date(
      secondItem.created_at || secondItem.createdAt || 0
    );

    return secondDate - firstDate;
  });
}

const contentMarkdownClasses = `
  text-slate-200 leading-relaxed
  [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-2 [&_h1]:mb-4
  [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-7 [&_h2]:mb-3
  [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-cyan-300 [&_h3]:mt-6 [&_h3]:mb-3
  [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-cyan-200 [&_h4]:mt-5 [&_h4]:mb-2
  [&_p]:my-3
  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
  [&_li]:my-1
  [&_strong]:font-bold [&_strong]:text-white
  [&_em]:italic
  [&_hr]:border-slate-700 [&_hr]:my-6
  [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-700
  [&_blockquote]:pl-4 [&_blockquote]:text-slate-300
  [&_code]:bg-slate-950 [&_code]:px-1 [&_code]:py-0.5
  [&_code]:rounded [&_code]:text-cyan-300
  [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-950
  [&_pre]:p-4 [&_pre]:my-4
  [&_table]:w-full [&_table]:border-collapse [&_table]:my-5
  [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-800 [&_th]:p-3 [&_th]:text-left
  [&_td]:border [&_td]:border-slate-700 [&_td]:p-3
`;

function createProjectSummaryFallback(project) {
  if (project?.ai_summary) {
    return project.ai_summary;
  }

  if (project?.description) {
    return project.description.length > 180
      ? `${project.description.slice(0, 180).trim()}...`
      : project.description;
  }

  return "No AI summary has been created for this project yet.";
}

function ProjectDetail() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [project, setProject] = useState(location.state?.project || null);
  const [workspace, setWorkspace] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [logos, setLogos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editingContent, setEditingContent] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [viewingItem, setViewingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteFinalConfirmed, setDeleteFinalConfirmed] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Move state
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveProjectId, setMoveProjectId] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [projects, setProjects] = useState([]);

  const numericProjectId = Number(projectId);
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/projects");
    }
  };

  const loadProjectDetail = useCallback(
    async (isRefresh = false) => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Your session has expired. Please sign in again.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const requestOptions = {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        };

        const [projectResponse, contentResponse, logoResponse, projectsResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/projects/${numericProjectId}`, requestOptions),
            fetch(
              `${API_BASE_URL}/content/?project_id=${numericProjectId}`,
              requestOptions
            ),
            fetch(
              `${API_BASE_URL}/product-architect/logos/${numericProjectId}`,
              requestOptions
            ),
            fetch(`${API_BASE_URL}/projects/`, requestOptions),
          ]);

        if (
          projectResponse.status === 401 ||
          contentResponse.status === 401 ||
          logoResponse.status === 401 ||
          projectsResponse.status === 401
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("tanioSession");
          localStorage.removeItem("tanioUser");

          throw new Error("Your session has expired. Please sign in again.");
        }

        if (!projectResponse.ok) {
          throw new Error("Unable to load this project.");
        }

        if (!contentResponse.ok) {
          throw new Error("Unable to load project content.");
        }

        if (!logoResponse.ok) {
          throw new Error("Unable to load project logos.");
        }

        if (!projectsResponse.ok) {
          throw new Error("Unable to load available projects.");
        }

        const [projectData, contentData, logoData, projectsData] = await Promise.all([
          projectResponse.json(),
          contentResponse.json(),
          logoResponse.json(),
          projectsResponse.json(),
        ]);

      setProject(projectData);

      setContentItems(
        sortNewestFirst(Array.isArray(contentData) ? contentData : [])
      );

      setLogos(
        sortNewestFirst(Array.isArray(logoData?.logos) ? logoData.logos : [])
      );
      
      setProjects(
        sortNewestFirst(Array.isArray(projectsData) ? projectsData : [])
      );

        if (projectData.workspace_id) {
          const workspaceResponse = await fetch(
            `${API_BASE_URL}/workspaces/${projectData.workspace_id}`,
            requestOptions
          );

          if (workspaceResponse.ok) {
            const workspaceData = await workspaceResponse.json();
            setWorkspace(workspaceData);
          } else {
            setWorkspace(null);
          }
        }
      } catch (requestError) {
        console.error("Project detail load failed:", requestError);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load this project."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [numericProjectId]
  );

  useEffect(() => {
    loadProjectDetail();
  }, [loadProjectDetail]);

  const totalSavedItems = useMemo(() => {
    return contentItems.length + logos.length;
  }, [contentItems.length, logos.length]);

  const openProductArchitect = () => {
    navigate("/product-architect", {
      state: {
        project,
      },
    });
  };

  const openTabletopCreator = () => {
    navigate("/tabletop-creator", {
      state: {
        project,
      },
    });
  };

  const openEditContent = (item) => {
    setEditingContent(item);
    setEditTitle(item.title || "");
    setEditBody(item.body || "");
    setEditError("");
    setEditSuccess("");
  };

  const closeEditContent = () => {
    if (editLoading) {
      return;
    }

    setEditingContent(null);
    setEditTitle("");
    setEditBody("");
    setEditError("");
    setEditSuccess("");
  };

  const saveContentEdits = async (event) => {
    event.preventDefault();

    if (!editingContent) {
      return;
    }

    const cleanedTitle = editTitle.trim();
    const cleanedBody = editBody.trim();

    if (!cleanedTitle) {
      setEditError("Content title is required.");
      return;
    }

    if (!cleanedBody) {
      setEditError("Content body is required.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setEditError("Your session has expired. Please sign in again.");
      return;
    }

    setEditLoading(true);
    setEditError("");
    setEditSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/content/${editingContent.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            title: cleanedTitle,
            body: cleanedBody,
            project_id: numericProjectId,
          }),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tanioSession");
        localStorage.removeItem("tanioUser");

        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "This content could not be updated. Please try again."
        );
      }

      const updatedContent = await response.json();

      setContentItems((currentItems) =>
        currentItems.map((item) =>
          item.id === updatedContent.id ? updatedContent : item
        )
      );

      setEditSuccess("Content updated successfully.");

      setTimeout(() => {
        closeEditContent();
      }, 600);
    } catch (requestError) {
      console.error("Content edit failed:", requestError);

      setEditError(
        requestError instanceof Error
          ? requestError.message
          : "This content could not be updated. Please try again."
      );
    } finally {
      setEditLoading(false);
    }
  };

  const openViewItem = (item, type = "content") => {
    setViewingItem({
      ...item,
      viewType: type,
    });
  };

  const closeViewItem = () => {
    setViewingItem(null);
  };

  const openMoveItem = (item, type = "content") => {
    setMoveTarget({
      ...item,
      moveType: type,
    });

    setMoveProjectId(String(item.project_id || numericProjectId));
    setMoveError("");
  };

  const closeMoveItem = () => {
    if (moveLoading) {
      return;
    }

    setMoveTarget(null);
    setMoveProjectId("");
    setMoveError("");
  };

  const confirmMoveItem = async () => {
    if (!moveTarget || !moveProjectId) {
      setMoveError("Please choose a project.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMoveError("Your session has expired. Please sign in again.");
      return;
    }

    setMoveLoading(true);
    setMoveError("");

    try {
      const endpoint =
        moveTarget.moveType === "image"
          ? `${API_BASE_URL}/product-architect/logos/${moveTarget.id}`
          : `${API_BASE_URL}/content/${moveTarget.id}`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          project_id: Number(moveProjectId),
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tanioSession");
        localStorage.removeItem("tanioUser");

        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "This item could not be moved. Please try again."
        );
      }

      if (moveTarget.moveType === "image") {
        setLogos((currentLogos) =>
          currentLogos.filter((logo) => logo.id !== moveTarget.id)
        );
      } else {
        setContentItems((currentItems) =>
          currentItems.filter((item) => item.id !== moveTarget.id)
        );
      }

      if (
        viewingItem?.id === moveTarget.id &&
        viewingItem?.viewType === moveTarget.moveType
      ) {
        setViewingItem(null);
      }

      closeMoveItem();
    } catch (requestError) {
      console.error("Move project item failed:", requestError);

      setMoveError(
        requestError instanceof Error
          ? requestError.message
          : "This item could not be moved. Please try again."
      );
    } finally {
      setMoveLoading(false);
    }
  };  

  const openDeleteItem = (item, type = "content") => {
    setDeleteTarget({
      ...item,
      deleteType: type,
    });
    setDeleteConfirmationText("");
    setDeleteFinalConfirmed(false);
    setDeleteError("");
  };

  const closeDeleteItem = () => {
    if (deleteLoading) {
      return;
    }

    setDeleteTarget(null);
    setDeleteConfirmationText("");
    setDeleteFinalConfirmed(false);
    setDeleteError("");
  };

  const confirmDeleteItem = async () => {
    if (
      !deleteTarget ||
      deleteConfirmationText !== "DELETE" ||
      !deleteFinalConfirmed
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setDeleteError("Your session has expired. Please sign in again.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const endpoint =
        deleteTarget.deleteType === "image"
          ? `${API_BASE_URL}/product-architect/logos/${deleteTarget.id}`
          : `${API_BASE_URL}/content/${deleteTarget.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tanioSession");
        localStorage.removeItem("tanioUser");

        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "This item could not be deleted. Please try again."
        );
      }

      if (deleteTarget.deleteType === "image") {
        setLogos((currentLogos) =>
          currentLogos.filter((logo) => logo.id !== deleteTarget.id)
        );
      } else {
        setContentItems((currentItems) =>
          currentItems.filter((item) => item.id !== deleteTarget.id)
        );
      }

      if (viewingItem?.id === deleteTarget.id) {
        setViewingItem(null);
      }

      closeDeleteItem();
    } catch (requestError) {
      console.error("Delete project item failed:", requestError);

      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "This item could not be deleted. Please try again."
      );
    } finally {
      setDeleteLoading(false);
    }
  };  

  return (
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-5 lg:px-6 xl:px-8">
      <div className="w-full max-w-none">
        <div className="mb-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <FaArrowLeft className="text-xs" />
            Back
          </button>

          {!loading && !error && project && (
            <button
              type="button"
              onClick={() => loadProjectDetail(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-300 shadow-sm transition hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>

        {loading && (
          <section className="flex min-h-80 items-center justify-center rounded-3xl border border-slate-800 bg-slate-900">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-900/60 bg-cyan-950/40">
                <FaSyncAlt className="animate-spin text-2xl text-cyan-400" />
              </div>
              <p className="font-semibold text-white">Loading project...</p>
              <p className="mt-1 text-sm text-slate-500">
                Getting your project details and saved content.
              </p>
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="flex min-h-80 items-center justify-center rounded-3xl border border-red-900 bg-red-950/20 p-8">
            <div className="max-w-lg text-center">
              <FaExclamationTriangle className="mx-auto mb-4 text-4xl text-red-400" />

              <h2 className="text-2xl font-bold text-white">
                Project could not be loaded
              </h2>

              <p className="mt-2 text-red-300">{error}</p>

              <button
                type="button"
                onClick={() => loadProjectDetail()}
                className="mt-6 rounded-xl bg-red-500 px-5 py-2.5 font-semibold text-white transition hover:bg-red-400"
              >
                Try Again
              </button>
            </div>
          </section>
        )}

        {!loading && !error && project && (
          <>
            <section className="relative overflow-hidden rounded-[30px] border border-cyan-900/60 bg-[#071222] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(14,165,233,0.22),transparent_22%),radial-gradient(circle_at_58%_75%,rgba(139,92,246,0.16),transparent_24%),linear-gradient(135deg,rgba(6,182,212,0.06),transparent_35%,rgba(2,6,23,0.15))]" />
              <div className="pointer-events-none absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full border border-cyan-400/10 shadow-[0_0_120px_rgba(6,182,212,0.08)]" />
              <div className="pointer-events-none absolute right-[16%] top-16 h-48 w-48 rounded-full border-[28px] border-cyan-400/10" />
              <div className="pointer-events-none absolute right-[16%] top-[9.1rem] h-9 w-48 border-y-[18px] border-cyan-400/10" />
              <div className="pointer-events-none absolute right-[20.55%] top-[8.3rem] h-20 w-20 rounded-full border-[16px] border-cyan-300/10" />

              <div className="relative grid xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_430px]">
                <div className="min-w-0">
                  <div className="border-b border-slate-800/80 px-6 py-5 sm:px-8 xl:px-10">
                    <nav
                      className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-300"
                      aria-label="Breadcrumb"
                    >
                      <button
                        type="button"
                        onClick={() => navigate("/workspaces")}
                        className="transition hover:text-cyan-300"
                      >
                        Workspaces
                      </button>

                      <span className="text-cyan-500">&gt;</span>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/projects?workspace=${project.workspace_id}`)
                        }
                        className="transition hover:text-cyan-300"
                      >
                        {workspace?.name || "Unknown Workspace"}
                      </button>

                      <span className="text-cyan-500">&gt;</span>

                      <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-bold text-cyan-200 shadow-sm shadow-cyan-950/40">
                        {project.title}
                      </span>
                    </nav>
                  </div>

                  <div className="px-6 py-8 sm:px-8 xl:px-10 xl:py-10 2xl:px-12">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                        Active Project
                      </span>

                      <span className="inline-flex items-center gap-2 rounded-full border border-cyan-900/70 bg-slate-950/55 px-3 py-1.5 text-xs font-medium text-slate-200">
                        <FaFolderOpen className="text-cyan-400" />
                        {workspace?.name || "Unknown Workspace"}
                      </span>

                      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/55 px-3 py-1.5 text-xs font-medium text-slate-400">
                        Project #{project.id}
                      </span>
                    </div>

                    <h1 className="mt-7 max-w-5xl text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl xl:text-6xl">
                      {project.title}
                    </h1>

                    <p className="mt-5 max-w-5xl text-base leading-7 text-slate-300 sm:text-lg">
                      {createPreview(
                        project.description ||
                          "No project description provided.",
                        420
                      )}
                    </p>

                    <div className="mt-8 grid overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/45 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="flex items-center gap-4 border-b border-slate-800/90 p-5 sm:border-r xl:border-b-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-900/60 bg-cyan-950/40 text-cyan-400">
                          <FaFileAlt />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Saved Content</p>
                          <p className="mt-1 text-2xl font-black text-white">
                            {contentItems.length}
                          </p>
                          <p className="text-[11px] text-slate-500">documents</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-b border-slate-800/90 p-5 xl:border-b-0 xl:border-r">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-900/60 bg-purple-950/30 text-purple-400">
                          <FaImage />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Saved Images</p>
                          <p className="mt-1 text-2xl font-black text-white">
                            {logos.length}
                          </p>
                          <p className="text-[11px] text-slate-500">images</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-b border-slate-800/90 p-5 sm:border-r xl:border-b-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-900/60 bg-blue-950/30 text-blue-400">
                          <FaLayerGroup />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Total Items</p>
                          <p className="mt-1 text-2xl font-black text-white">
                            {totalSavedItems}
                          </p>
                          <p className="text-[11px] text-slate-500">total saved</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-900/60 bg-emerald-950/30 text-emerald-400">
                          <FaFolderOpen />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-400">Workspace</p>
                          <p className="mt-1 truncate text-base font-bold text-white">
                            {workspace?.name || "Unknown Workspace"}
                          </p>
                          <p className="text-[11px] text-slate-500">project location</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="border-t border-slate-800/80 bg-[#06111f]/90 p-6 sm:p-7 xl:border-l xl:border-t-0 xl:p-7 2xl:p-8">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-900/70 bg-cyan-950/45 text-cyan-400">
                      <FaBolt />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                        Quick Launch
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-white">
                        Continue building
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Jump directly into the Tanio tools connected to this project.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={openProductArchitect}
                      className="group flex w-full items-center gap-4 rounded-2xl border border-cyan-700/50 bg-cyan-950/35 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-950/55 hover:shadow-[0_12px_35px_rgba(6,182,212,0.12)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-lg text-slate-950 shadow-lg shadow-cyan-950/40">
                        <FaBrain />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white">
                          Product Architect
                        </p>
                        <p className="mt-1 text-xs leading-5 text-cyan-100/60">
                          Product strategy, requirements, branding, and planning.
                        </p>
                      </div>

                      <FaArrowRight className="text-cyan-400 transition group-hover:translate-x-1" />
                    </button>

                    <button
                      type="button"
                      onClick={openTabletopCreator}
                      className="group flex w-full items-center gap-4 rounded-2xl border border-purple-700/50 bg-purple-950/30 p-4 text-left transition hover:-translate-y-0.5 hover:border-purple-400 hover:bg-purple-950/50 hover:shadow-[0_12px_35px_rgba(168,85,247,0.12)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-lg text-white shadow-lg shadow-purple-950/40">
                        <FaDiceD20 />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white">
                          Tabletop Creator
                        </p>
                        <p className="mt-1 text-xs leading-5 text-purple-100/60">
                          Campaigns, worlds, encounters, characters, and stories.
                        </p>
                      </div>

                      <FaArrowRight className="text-purple-400 transition group-hover:translate-x-1" />
                    </button>
                  </div>

                  <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Project Actions
                    </p>

                    <button
                      type="button"
                      onClick={() => loadProjectDetail(true)}
                      disabled={refreshing}
                      className="mt-3 flex w-full items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
                        {refreshing ? "Refreshing..." : "Refresh Project"}
                      </span>
                      <FaSyncAlt className={refreshing ? "animate-spin" : "text-slate-600"} />
                    </button>
                  </div>
                </aside>
              </div>
            </section>

            <section className="mt-8 w-full">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Project Context
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Brief & AI Insight
                  </h2>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
                  <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Original Input
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-white">
                        Project Brief
                      </h3>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-400">
                      <FaFileAlt />
                    </div>
                  </header>

                  <div className="p-6">
                    <div className="min-h-[180px] rounded-xl border border-slate-800 bg-slate-950/55 p-5">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">
                        {project.description || "No project description provided."}
                      </p>
                    </div>
                  </div>
                </article>

                <article className="overflow-hidden rounded-2xl border border-cyan-900/50 bg-slate-900 shadow-lg shadow-black/10">
                  <header className="flex items-center justify-between gap-4 border-b border-cyan-900/30 px-6 py-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-500">
                        AI Generated
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-white">
                        AI Summary
                      </h3>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-900/60 bg-cyan-950/45 text-cyan-400">
                      <FaBrain />
                    </div>
                  </header>

                  <div className="p-6">
                    <div className="min-h-[180px] rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-5">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-cyan-50/90 sm:text-base">
                        {createProjectSummaryFallback(project)}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section className="mt-10">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-900/60 bg-cyan-950/40 text-cyan-400">
                    <FaFileAlt />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Project Library
                    </p>
                    <h2 className="text-2xl font-bold text-white">
                      Saved Content
                    </h2>
                  </div>
                </div>

                <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                  {contentItems.length}{" "}
                  {contentItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              {contentItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-2xl text-slate-500">
                    <FaFolderOpen />
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-white">
                    No saved content yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-lg text-slate-400">
                    Open Product Architect or Tabletop Creator to generate and save content to this project.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {contentItems.map((item) => (
                    <article
                      key={item.id}
                      className="group flex min-h-[270px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl hover:shadow-black/20"
                    >
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                              {item.content_type}
                            </span>

                            <h3 className="mt-3 line-clamp-2 text-lg font-bold text-white">
                              {item.title}
                            </h3>
                          </div>

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-500 transition group-hover:text-cyan-400">
                            <FaFileAlt />
                          </div>
                        </div>

                        <p className="mt-4 line-clamp-4 flex-1 text-sm leading-6 text-slate-400">
                          {createPreview(item.body)}
                        </p>
                      </div>

                      <div className="border-t border-slate-800 bg-slate-950/35 px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openViewItem(item, "content")}
                          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                        >
                          <FaEye />
                          View
                        </button>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditContent(item)}
                            className="rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => openMoveItem(item, "content")}
                            className="rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                          >
                            Move
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteItem(item, "content")}
                            className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
                          >
                            <FaTrash />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-10 pb-2">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-900/60 bg-emerald-950/30 text-emerald-400">
                    <FaImage />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Visual Assets
                    </p>
                    <h2 className="text-2xl font-bold text-white">
                      Saved Images
                    </h2>
                  </div>
                </div>

                <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                  {logos.length} {logos.length === 1 ? "image" : "images"}
                </span>
              </div>

              {logos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-2xl text-slate-500">
                    <FaImage />
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-white">
                    No saved images yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-lg text-slate-400">
                    Generate or save images from Product Architect and they will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                  {logos.map((logo) => (
                    <article
                      key={logo.id}
                      className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl hover:shadow-black/20"
                    >
                      <div className="bg-slate-950 p-4">
                        <img
                          src={`data:image/png;base64,${logo.image_base64}`}
                          alt={`${project.title} saved logo`}
                          className="h-52 w-full rounded-xl border border-slate-800 bg-white object-contain"
                        />
                      </div>

                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Saved Image
                            </p>
                            <p className="mt-1 font-semibold text-white">
                              {logo.style || "Default"} style
                            </p>
                          </div>

                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-emerald-400">
                            <FaImage />
                          </div>
                        </div>

                        <div className="mt-5 border-t border-slate-800 pt-4">
                          <button
                            type="button"
                            onClick={() => openViewItem(logo, "image")}
                            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                          >
                            <FaEye />
                            View
                          </button>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openMoveItem(logo, "image")}
                              className="rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                              Move
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteItem(logo, "image")}
                              className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 hover:text-red-300"
                            >
                              <FaTrash />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

      </div>

      {viewingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeViewItem();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-item-title"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-5 border-b border-slate-800 p-6">
              <div>
                <p className="text-sm text-slate-500">
                  {viewingItem.viewType === "image" ? "Saved Image" : viewingItem.content_type}
                </p>

                <h3
                  id="view-item-title"
                  className="mt-1 text-2xl font-bold text-white"
                >
                  {viewingItem.viewType === "image"
                    ? `${project.title} Image`
                    : viewingItem.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeViewItem}
                aria-label="Close item preview"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <FaTimes />
              </button>
            </header>

            <div className="overflow-y-auto p-6">
              {viewingItem.viewType === "image" ? (
                <img
                  src={`data:image/png;base64,${viewingItem.image_base64}`}
                  alt={`${project.title} saved image`}
                  className="mx-auto max-h-[65vh] rounded-xl border border-slate-700 bg-white object-contain"
                />
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
                  <div className={contentMarkdownClasses}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {viewingItem.body}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex justify-end border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={closeViewItem}
                className="rounded-lg bg-slate-800 px-5 py-2 font-semibold text-white transition hover:bg-slate-700"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}      

      {editingContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditContent();
            }
          }}
        >
          <form
            onSubmit={saveContentEdits}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-content-title"
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <header className="border-b border-slate-800 p-6">
              <h3
                id="edit-content-title"
                className="text-2xl font-bold text-white"
              >
                Edit Saved Content
              </h3>

              <p className="mt-2 text-slate-400">
                Update the saved title or content body for this project file.
              </p>
            </header>

            <div className="space-y-5 overflow-y-auto p-6">
              <div>
                <label
                  htmlFor="edit-content-name"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Title
                </label>

                <input
                  id="edit-content-name"
                  type="text"
                  value={editTitle}
                  onChange={(event) => {
                    setEditTitle(event.target.value);
                    setEditError("");
                    setEditSuccess("");
                  }}
                  disabled={editLoading}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-content-body"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Content
                </label>

                <textarea
                  id="edit-content-body"
                  value={editBody}
                  onChange={(event) => {
                    setEditBody(event.target.value);
                    setEditError("");
                    setEditSuccess("");
                  }}
                  disabled={editLoading}
                  rows={18}
                  className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm leading-6 text-white outline-none transition focus:border-cyan-500 disabled:opacity-50"
                />
              </div>

              {editError && (
                <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-300">
                  {editSuccess}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={closeEditContent}
                disabled={editLoading}
                className="rounded-lg bg-slate-800 px-5 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={editLoading}
                className="rounded-lg bg-cyan-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {moveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMoveItem();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-item-title"
            className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <header className="border-b border-slate-800 p-6">
              <h3
                id="move-item-title"
                className="text-2xl font-bold text-white"
              >
                Move this item
              </h3>

              <p className="mt-2 text-slate-400">
                Choose the project this item should belong to.
              </p>
            </header>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-500">Item</p>

                <p className="mt-1 font-semibold text-white">
                  {moveTarget.moveType === "image"
                    ? `${project.title} Image`
                    : moveTarget.title}
                </p>

                <p className="mt-3 text-sm text-slate-500">
                  Current Project
                </p>

                <p className="mt-1 text-slate-300">
                  {project.title}
                </p>
              </div>

              <div>
                <label
                  htmlFor="project-detail-move-project"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Move to project
                </label>

                <select
                  id="project-detail-move-project"
                  value={moveProjectId}
                  onChange={(event) => {
                    setMoveProjectId(event.target.value);
                    setMoveError("");
                  }}
                  disabled={moveLoading}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-500 disabled:opacity-50"
                >
                  <option value="">Choose a project</option>

                  {projects.map((availableProject) => (
                    <option
                      key={availableProject.id}
                      value={availableProject.id}
                    >
                      {availableProject.title}
                    </option>
                  ))}
                </select>
              </div>

              {moveError && (
                <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
                  {moveError}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={closeMoveItem}
                disabled={moveLoading}
                className="rounded-lg bg-slate-800 px-5 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmMoveItem}
                disabled={
                  moveLoading ||
                  !moveProjectId ||
                  Number(moveProjectId) === numericProjectId
                }
                className="rounded-lg bg-cyan-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {moveLoading ? "Moving..." : "Move Item"}
              </button>
            </footer>
          </section>
        </div>
      )}      

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteItem();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-item-title"
            className="w-full max-w-xl rounded-2xl border border-red-900 bg-slate-900 shadow-2xl"
          >
            <header className="border-b border-red-900/60 p-6">
              <h3
                id="delete-item-title"
                className="text-2xl font-bold text-white"
              >
                Delete this item?
              </h3>

              <p className="mt-2 text-red-300">
                This action is permanent and cannot be undone.
              </p>
            </header>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-500">Item</p>

                <p className="mt-1 font-semibold text-white">
                  {deleteTarget.deleteType === "image"
                    ? `${project.title} Image`
                    : deleteTarget.title}
                </p>

                <p className="mt-3 text-sm text-slate-500">Type</p>

                <p className="mt-1 text-slate-300">
                  {deleteTarget.deleteType === "image"
                    ? "Saved Image"
                    : deleteTarget.content_type}
                </p>

                <p className="mt-3 text-sm text-slate-500">Project</p>

                <p className="mt-1 text-slate-300">
                  {project.title}
                </p>
              </div>

              {deleteError && (
                <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
                  {deleteError}
                </div>
              )}

              <div>
                <label
                  htmlFor="project-detail-delete-confirmation-text"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Type DELETE to confirm.
                </label>

                <input
                  id="project-detail-delete-confirmation-text"
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(event) => setDeleteConfirmationText(event.target.value)}
                  disabled={deleteLoading}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-red-500 disabled:opacity-50"
                  placeholder="DELETE"
                />
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
                <input
                  type="checkbox"
                  checked={deleteFinalConfirmed}
                  onChange={(event) => setDeleteFinalConfirmed(event.target.checked)}
                  disabled={deleteLoading}
                  className="mt-1"
                />

                <span>
                  I understand I am about to permanently delete this item from this
                  project file.
                </span>
              </label>
            </div>

            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={closeDeleteItem}
                disabled={deleteLoading}
                className="rounded-lg bg-slate-800 px-5 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteItem}
                disabled={
                  deleteLoading ||
                  deleteConfirmationText !== "DELETE" ||
                  !deleteFinalConfirmed
                }
                className="rounded-lg bg-red-700 px-5 py-2 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading
                  ? "Deleting..."
                  : "I understand, permanently delete this item"}
              </button>
            </footer>
          </section>
        </div>
      )}

    </main>
  );
}

export default ProjectDetail;