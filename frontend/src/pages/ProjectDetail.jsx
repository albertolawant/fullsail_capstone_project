import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FaArrowLeft,
  FaBrain,
  FaDiceD20,
  FaExclamationTriangle,
  FaFileAlt,
  FaFolderOpen,
  FaImage,
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

        const [projectResponse, contentResponse, logoResponse] =
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
          ]);

        if (
          projectResponse.status === 401 ||
          contentResponse.status === 401 ||
          logoResponse.status === 401
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

        const [projectData, contentData, logoData] = await Promise.all([
          projectResponse.json(),
          contentResponse.json(),
          logoResponse.json(),
        ]);

        setProject(projectData);
        setContentItems(Array.isArray(contentData) ? contentData : []);
        setLogos(Array.isArray(logoData?.logos) ? logoData.logos : []);

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
    <main className="flex-1 p-6 md:p-10">
      <div className="mb-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-cyan-300"
        >
          <FaArrowLeft />
          Back
        </button>
      </div>

      {loading && (
        <section className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
          <div className="text-center">
            <FaSyncAlt className="mx-auto mb-4 animate-spin text-3xl text-cyan-400" />

            <p className="font-semibold text-white">
              Loading project file...
            </p>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="flex min-h-80 items-center justify-center rounded-2xl border border-red-900 bg-red-950/20 p-8">
          <div className="max-w-lg text-center">
            <FaExclamationTriangle className="mx-auto mb-4 text-4xl text-red-400" />

            <h2 className="text-2xl font-bold text-white">
              Project could not be loaded
            </h2>

            <p className="mt-2 text-red-300">{error}</p>

            <button
              type="button"
              onClick={() => loadProjectDetail()}
              className="mt-6 rounded-lg bg-red-500 px-5 py-2 font-semibold text-white transition hover:bg-red-400"
            >
              Try Again
            </button>
          </div>
        </section>
      )}

      {!loading && !error && project && (
        <>
          <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <nav
                  className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500"
                  aria-label="Breadcrumb"
                >
                  <button
                    type="button"
                    onClick={() => navigate("/workspaces")}
                    className="transition hover:text-cyan-300"
                  >
                    Workspaces
                  </button>

                  <span className="text-slate-600">&gt;</span>

                  <button
                    type="button"
                    onClick={() => navigate(`/projects?workspace=${workspace.id}`)}
                    className="text-slate-300 transition hover:text-cyan-300"
                  >
                    {workspace?.name || `Workspace ${project.workspace_id}`}
                  </button>

                  <span className="text-slate-600">&gt;</span>

                  <span className="font-semibold text-cyan-300">
                    {project.title}
                  </span>
                </nav>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                  Project File
                </p>

                <h1 className="mt-2 text-4xl font-bold text-white">
                  {project.title}
                </h1>

                <div className="mt-6 grid max-w-5xl gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Original Description
                    </p>

                    <p className="mt-3 leading-7 text-slate-300">
                      {project.description || "No project description provided."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                      AI Summary
                    </p>

                    <p className="mt-3 leading-7 text-cyan-100">
                      {createProjectSummaryFallback(project)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-slate-300">
                    Workspace:{" "}
                    <span className="text-white">
                      {workspace?.name || `Workspace ${project.workspace_id}`}
                    </span>
                  </span>

                  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-slate-300">
                    Saved Items:{" "}
                    <span className="text-white">{totalSavedItems}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadProjectDetail(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={openProductArchitect}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <FaBrain />
                  Product Architect
                </button>

                <button
                  type="button"
                  onClick={openTabletopCreator}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 font-semibold text-white transition hover:bg-purple-400"
                >
                  <FaDiceD20 />
                  Tabletop Creator
                </button>
              </div>
            </div>
          </section>

          <section className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-500">Project ID</p>
              <p className="mt-2 text-2xl font-bold text-white">
                #{project.id}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-500">Saved Content</p>
              <p className="mt-2 text-2xl font-bold text-cyan-400">
                {contentItems.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-500">Saved Images</p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {logos.length}
              </p>
            </div>
          </section>

          <section className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <FaFileAlt className="text-cyan-400" />

              <h2 className="text-2xl font-bold text-white">
                Saved Content
              </h2>
            </div>

            {contentItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
                <FaFolderOpen className="mx-auto mb-4 text-5xl text-slate-500" />

                <h3 className="text-xl font-bold text-white">
                  No content saved to this project yet
                </h3>

                <p className="mt-2 text-slate-400">
                  Open a module to generate content for this project.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {contentItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <h3 className="text-xl font-bold text-white">
                      {item.title}
                    </h3>

                    <span className="mt-3 inline-flex rounded-full border border-cyan-800 bg-cyan-950/50 px-3 py-1 text-xs font-semibold text-cyan-300">
                      {item.content_type}
                    </span>

                    <p className="mt-4 text-sm leading-6 text-slate-400">
                      {createPreview(item.body)}
                    </p>

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openViewItem(item, "content")}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                      >
                        <FaEye />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditContent(item)}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteItem(item, "content")}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <FaImage className="text-emerald-400" />

              <h2 className="text-2xl font-bold text-white">
                Saved Images
              </h2>
            </div>

            {logos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
                <FaImage className="mx-auto mb-4 text-5xl text-slate-500" />

                <h3 className="text-xl font-bold text-white">
                  No images saved to this project yet
                </h3>

                <p className="mt-2 text-slate-400">
                  Generate or save images from Product Architect to view them here.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {logos.map((logo) => (
                  <article
                    key={logo.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <img
                      src={`data:image/png;base64,${logo.image_base64}`}
                      alt={`${project.title} saved logo`}
                      className="h-44 w-full rounded-xl border border-slate-700 bg-white object-contain"
                    />

                    <p className="mt-4 text-sm text-slate-400">
                      Style: {logo.style || "default"}
                    </p>

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openViewItem(logo, "image")}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                      >
                        <FaEye />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteItem(logo, "image")}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        <FaTrash />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

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