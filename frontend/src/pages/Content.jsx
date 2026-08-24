import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FaBrain,
  FaDiceD20,
  FaExclamationTriangle,
  FaEye,
  FaFileAlt,
  FaFolderOpen,
  FaSearch,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";

const API_BASE_URL = "http://127.0.0.1:8000";

const CATEGORY_ALL = "All";
const CATEGORY_PRODUCT = "Product Architect";
const CATEGORY_TABLETOP = "Tabletop Creator";
const CATEGORY_LOGOS = "Saved Logos";
const CATEGORY_OTHER = "Other";

function determineCategory(contentType = "") {
  const normalizedType = contentType.trim().toLowerCase();

  const tabletopKeywords = [
    "campaign",
    "npc",
    "quest",
    "encounter",
    "location",
    "character",
    "world",
    "item",
    "tabletop",
  ];

  const productKeywords = [
    "product",
    "requirement",
    "prd",
    "persona",
    "user stor",
    "feature",
    "architecture",
    "roadmap",
    "risk",
    "swot",
    "market",
    "technical",
  ];

  if (tabletopKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return CATEGORY_TABLETOP;
  }

  if (productKeywords.some((keyword) => normalizedType.includes(keyword))) {
    return CATEGORY_PRODUCT;
  }

  return CATEGORY_OTHER;
}

function getCategoryIcon(category) {
  if (category === CATEGORY_PRODUCT) {
    return <FaBrain />;
  }

  if (category === CATEGORY_TABLETOP) {
    return <FaDiceD20 />;
  }

  if (category === CATEGORY_LOGOS) {
    return <FaFileAlt />;
  }

  return <FaFileAlt />;
}

function getCategoryBadgeClasses(category) {
  if (category === CATEGORY_PRODUCT) {
    return "border-cyan-800 bg-cyan-950/50 text-cyan-300";
  }

  if (category === CATEGORY_TABLETOP) {
    return "border-purple-800 bg-purple-950/50 text-purple-300";
  }

  if (category === CATEGORY_LOGOS) {
    return "border-emerald-800 bg-emerald-950/50 text-emerald-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-300";
}

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

function Content() {
  const [contentItems, setContentItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_ALL);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteFinalConfirmed, setDeleteFinalConfirmed] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadLibrary = useCallback(async (isRefresh = false) => {
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

      const [contentResponse, projectsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/content/`, requestOptions),
        fetch(`${API_BASE_URL}/projects/`, requestOptions),
      ]);

      if (contentResponse.status === 401 || projectsResponse.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tanioSession");
        localStorage.removeItem("tanioUser");

        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Unable to load your saved content."
        );
      }

      if (!projectsResponse.ok) {
        const errorData = await projectsResponse.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Unable to load project information."
        );
      }

      const [contentData, projectData] = await Promise.all([
        contentResponse.json(),
        projectsResponse.json(),
      ]);

      const safeProjects = Array.isArray(projectData) ? projectData : [];

      const logoRequests = await Promise.all(
        safeProjects.map(async (project) => {
          try {
            const logoResponse = await fetch(
              `${API_BASE_URL}/product-architect/logos/${project.id}`,
              requestOptions
            );

            if (!logoResponse.ok) {
              return [];
            }

            const logoData = await logoResponse.json();

            return Array.isArray(logoData?.logos)
              ? logoData.logos.map((logo) => ({
                  id: `logo-${logo.id}`,
                  project_id: logo.project_id,
                  title: `${project.title} Logo`,
                  content_type: "Saved Logo",
                  body: "",
                  image_base64: logo.image_base64,
                  style: logo.style,
                  preferred_colors: logo.preferred_colors,
                  logo_ideas: logo.logo_ideas,
                  branding_direction: logo.branding_direction,
                  created_at: logo.created_at,
                  isLogo: true,
                }))
              : [];
          } catch {
            return [];
          }
        })
      );

      const logoItems = logoRequests.flat();

      setContentItems([
        ...(Array.isArray(contentData) ? contentData : []),
        ...logoItems,
      ]);

      setProjects(safeProjects);
    } catch (requestError) {
      console.error("Content Library request failed:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the Content Library."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (!selectedContent) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedContent(null);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedContent]);

  const projectNames = useMemo(() => {
    return projects.reduce((lookup, project) => {
      lookup[project.id] = project.title;
      return lookup;
    }, {});
  }, [projects]);

  const preparedContent = useMemo(() => {
    return contentItems.map((item) => ({
      ...item,
      category: item.isLogo
        ? CATEGORY_LOGOS
        : determineCategory(item.content_type),
      projectName:
        projectNames[item.project_id] || `Project #${item.project_id}`,
    }));
  }, [contentItems, projectNames]);

  const availableCategories = useMemo(() => {
    const categories = new Set(
      preparedContent.map((item) => item.category)
    );

    return [
      CATEGORY_ALL,
      CATEGORY_PRODUCT,
      CATEGORY_TABLETOP,
      ...(categories.has(CATEGORY_LOGOS) ? [CATEGORY_LOGOS] : []),
      ...(categories.has(CATEGORY_OTHER) ? [CATEGORY_OTHER] : []),
    ];
  }, [preparedContent]);

  const filteredContent = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return preparedContent.filter((item) => {
      const categoryMatches =
        selectedCategory === CATEGORY_ALL ||
        item.category === selectedCategory;

      if (!categoryMatches) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        item.title?.toLowerCase().includes(normalizedSearch) ||
        item.content_type?.toLowerCase().includes(normalizedSearch) ||
        item.body?.toLowerCase().includes(normalizedSearch) ||
        item.projectName?.toLowerCase().includes(normalizedSearch) ||
        item.style?.toLowerCase().includes(normalizedSearch) ||
        item.preferred_colors?.toLowerCase().includes(normalizedSearch) ||
        item.logo_ideas?.toLowerCase().includes(normalizedSearch) ||
        item.branding_direction?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [preparedContent, searchTerm, selectedCategory]);

  const groupedContent = useMemo(() => {
    return filteredContent.reduce((groups, item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }

      groups[item.category].push(item);
      return groups;
    }, {});
  }, [filteredContent]);

  const visibleCategoryOrder =
    selectedCategory === CATEGORY_ALL
      ? [CATEGORY_PRODUCT, CATEGORY_TABLETOP, CATEGORY_LOGOS, CATEGORY_OTHER]
      : [selectedCategory];

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory(CATEGORY_ALL);
  };

  const openDeleteConfirmation = (item) => {
    setDeleteTarget(item);
    setDeleteConfirmationText("");
    setDeleteFinalConfirmed(false);
    setDeleteError("");
  };

  const closeDeleteConfirmation = () => {
    if (deleteLoading) {
      return;
    }

    setDeleteTarget(null);
    setDeleteConfirmationText("");
    setDeleteFinalConfirmed(false);
    setDeleteError("");
  };

  const handleDeleteContentItem = async () => {
    if (!deleteTarget || deleteConfirmationText !== "DELETE" || !deleteFinalConfirmed) {
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
      const endpoint = deleteTarget.isLogo
        ? `${API_BASE_URL}/product-architect/logos/${String(deleteTarget.id).replace("logo-", "")}`
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

      setContentItems((previousItems) =>
        previousItems.filter(
          (item) => String(item.id) !== String(deleteTarget.id)
        )
      );

      if (selectedContent?.id === deleteTarget.id) {
        setSelectedContent(null);
      }

      closeDeleteConfirmation();
    } catch (requestError) {
      console.error("Delete content failed:", requestError);

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
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-4xl font-bold">Content Library</h2>

          <p className="mt-2 text-slate-400">
            View all AI-generated content saved across your Tanio AI projects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadLibrary(true)}
          disabled={refreshing}
          className="flex w-fit items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="relative">
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title, type, project, content, or logo details..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {availableCategories.map((category) => {
            const isActive = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-cyan-500 bg-cyan-500 text-slate-950"
                    : "border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-700 hover:text-cyan-300"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      {loading && (
        <section className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
          <div className="text-center">
            <FaSyncAlt className="mx-auto mb-4 animate-spin text-3xl text-cyan-400" />

            <p className="font-semibold text-white">
              Loading your Content Library...
            </p>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="flex min-h-80 items-center justify-center rounded-2xl border border-red-900 bg-red-950/20 p-8">
          <div className="max-w-lg text-center">
            <FaExclamationTriangle className="mx-auto mb-4 text-4xl text-red-400" />

            <h3 className="text-xl font-bold text-white">
              Content could not be loaded
            </h3>

            <p className="mt-2 text-red-300">{error}</p>

            <button
              type="button"
              onClick={() => loadLibrary()}
              className="mt-6 rounded-lg bg-red-500 px-5 py-2 font-semibold text-white transition hover:bg-red-400"
            >
              Try Again
            </button>
          </div>
        </section>
      )}

      {!loading && !error && preparedContent.length === 0 && (
        <section className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8">
          <div className="max-w-lg text-center">
            <FaFolderOpen className="mx-auto mb-4 text-5xl text-slate-500" />

            <h3 className="text-2xl font-bold text-white">
              No saved content yet
            </h3>

            <p className="mt-2 text-slate-400">
              Generate and save content or logos from Product Architect or
              Tabletop Creator, and it will appear here.
            </p>
          </div>
        </section>
      )}

      {!loading &&
        !error &&
        preparedContent.length > 0 &&
        filteredContent.length === 0 && (
          <section className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8">
            <div className="max-w-lg text-center">
              <FaSearch className="mx-auto mb-4 text-4xl text-slate-500" />

              <h3 className="text-xl font-bold text-white">
                No matching content
              </h3>

              <p className="mt-2 text-slate-400">
                Try another search or select a different category.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-lg bg-cyan-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Clear Filters
              </button>
            </div>
          </section>
        )}

      {!loading && !error && filteredContent.length > 0 && (
        <div className="space-y-10">
          {visibleCategoryOrder.map((category) => {
            const categoryItems = groupedContent[category] || [];

            if (categoryItems.length === 0) {
              return null;
            }

            return (
              <section key={category}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-xl text-cyan-400">
                    {getCategoryIcon(category)}
                  </span>

                  <h3 className="text-2xl font-bold">{category}</h3>

                  <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                    {categoryItems.length}
                  </span>
                </div>

                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {categoryItems.map((item) => (
                    <article
                      key={item.id}
                      className="flex min-h-72 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="break-words text-xl font-bold text-white">
                            {item.title}
                          </h4>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.projectName}
                          </p>
                        </div>

                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getCategoryBadgeClasses(
                            item.category
                          )}`}
                        >
                          {getCategoryIcon(item.category)}
                        </span>
                      </div>

                      <div className="mt-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryBadgeClasses(
                            item.category
                          )}`}
                        >
                          {item.content_type}
                        </span>
                      </div>

                      {item.isLogo ? (
                        <div className="mt-4 flex-1">
                          <img
                            src={`data:image/png;base64,${item.image_base64}`}
                            alt={`${item.projectName} saved logo`}
                            className="h-40 w-full rounded-xl border border-slate-700 bg-white object-contain"
                          />

                          <p className="mt-3 text-sm text-slate-400">
                            Style: {item.style || "default"}
                          </p>

                          {(item.preferred_colors ||
                            item.logo_ideas ||
                            item.branding_direction) && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                              {[
                                item.preferred_colors,
                                item.logo_ideas,
                                item.branding_direction,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-4 flex-1 text-sm leading-6 text-slate-400">
                          {createPreview(item.body)}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedContent(item)}
                          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                        >
                          <FaEye />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteConfirmation(item)}
                          className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selectedContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedContent(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="content-dialog-title"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-5 border-b border-slate-800 p-6">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryBadgeClasses(
                      selectedContent.category
                    )}`}
                  >
                    {selectedContent.content_type}
                  </span>

                  <span className="text-sm text-slate-500">
                    {selectedContent.projectName}
                  </span>
                </div>

                <h3
                  id="content-dialog-title"
                  className="break-words text-2xl font-bold text-white"
                >
                  {selectedContent.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedContent(null)}
                aria-label="Close content details"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <FaTimes />
              </button>
            </header>

            <div className="overflow-y-auto p-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
                {selectedContent.isLogo ? (
                  <div>
                    <img
                      src={`data:image/png;base64,${selectedContent.image_base64}`}
                      alt={`${selectedContent.projectName} saved logo`}
                      className="mx-auto max-h-[60vh] rounded-xl border border-slate-700 bg-white object-contain"
                    />

                    <dl className="mt-6 space-y-3 text-sm">
                      <div>
                        <dt className="text-slate-500">Style</dt>
                        <dd className="mt-1 capitalize text-slate-200">
                          {selectedContent.style || "default"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Preferred Colors</dt>
                        <dd className="mt-1 text-slate-200">
                          {selectedContent.preferred_colors || "Default"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Logo Ideas / Symbols</dt>
                        <dd className="mt-1 text-slate-200">
                          {selectedContent.logo_ideas || "None"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">Branding Direction</dt>
                        <dd className="mt-1 text-slate-200">
                          {selectedContent.branding_direction || "Default"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <div className={contentMarkdownClasses}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedContent.body}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>

            <footer className="flex justify-end border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={() => setSelectedContent(null)}
                className="rounded-lg bg-slate-800 px-5 py-2 font-semibold text-white transition hover:bg-slate-700"
              >
                Close
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
              closeDeleteConfirmation();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-xl rounded-2xl border border-red-900 bg-slate-900 shadow-2xl"
          >
            <header className="border-b border-red-900/60 p-6">
              <h3 id="delete-dialog-title" className="text-2xl font-bold text-white">
                Delete this item?
              </h3>

              <p className="mt-2 text-red-300">
                This action is permanent. This item will be removed from your Content
                Vault and cannot be restored.
              </p>
            </header>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-500">Item</p>
                <p className="mt-1 font-semibold text-white">{deleteTarget.title}</p>

                <p className="mt-3 text-sm text-slate-500">Type</p>
                <p className="mt-1 text-slate-300">{deleteTarget.content_type}</p>

                <p className="mt-3 text-sm text-slate-500">Project</p>
                <p className="mt-1 text-slate-300">{deleteTarget.projectName}</p>
              </div>

              {deleteError && (
                <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-red-300">
                  {deleteError}
                </div>
              )}

              <div>
                <label
                  htmlFor="delete-confirmation-text"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Type DELETE to confirm.
                </label>

                <input
                  id="delete-confirmation-text"
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
                  I understand I am about to permanently delete this item from the
                  Content Vault.
                </span>
              </label>
            </div>

            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={deleteLoading}
                className="rounded-lg bg-slate-800 px-5 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteContentItem}
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

export default Content;