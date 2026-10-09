import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FormattingHelp from "../components/FormattingHelp";
import LearningMaterialView from "../components/LearningMaterialView";
import LearningMaterialEditor from "../components/LearningMaterialEditor";
import {
  getLearningMaterialFileName,
  getLearningMaterialPreview,
  isLearningStudioContent,
  learningMaterialToMarkdown,
  parseLearningMaterial,
  serializeLearningMaterial,
} from "../utils/learningStudioContent";
import { exportContentAsPdf } from "../utils/exportPdf";
import { exportContentAsMarkdown } from "../utils/exportMarkdown";
import { exportContentAsTxt } from "../utils/exportTxt";
import { exportContentAsDocx } from "../utils/exportDocx";
import {
  FaBrain,
  FaDiceD20,
  FaDownload,
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
const CATEGORY_PROBLEM = "Problem Solver";
const CATEGORY_LEARNING = "Learning Studio";
const CATEGORY_LOGOS = "Saved Logos";
const CATEGORY_OTHER = "Other";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-50";

const BUTTON_CLASS =
  "rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY_BUTTON =
  "rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

const MARKDOWN_CLASSES = `
  break-words text-slate-200 leading-relaxed
  [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-6
  [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-4
  [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-cyan-400 [&_h3]:mt-6 [&_h3]:mb-3
  [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-5 [&_h4]:mb-3
  [&_p]:mb-4 [&_p]:leading-relaxed
  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-2
  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-2
  [&_strong]:font-semibold [&_strong]:text-white
  [&_hr]:border-slate-700 [&_hr]:my-8
  [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-500
  [&_blockquote]:pl-4 [&_blockquote]:my-4
  [&_code]:rounded [&_code]:bg-slate-950 [&_code]:text-cyan-300
  [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl
  [&_pre]:border [&_pre]:border-slate-800 [&_pre]:bg-slate-950 [&_pre]:p-4
  [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse
  [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-800
  [&_th]:px-4 [&_th]:py-3 [&_th]:text-left
  [&_td]:border [&_td]:border-slate-700 [&_td]:px-4 [&_td]:py-3
`;

function determineCategory(contentType = "") {
  if (isLearningStudioContent(contentType)) {
    return CATEGORY_LEARNING;
  }

  const normalized = contentType
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (normalized.includes("problem solver")) {
    return CATEGORY_PROBLEM;
  }

  if (
    [
      "campaign", "npc", "quest", "encounter", "location",
      "character", "world", "item", "tabletop",
    ].some((keyword) => normalized.includes(keyword))
  ) {
    return CATEGORY_TABLETOP;
  }

  if (
    [
      "product", "requirement", "prd", "persona", "user stor",
      "feature", "architecture", "roadmap", "risk", "swot",
      "market", "technical",
    ].some((keyword) => normalized.includes(keyword))
  ) {
    return CATEGORY_PRODUCT;
  }

  return CATEGORY_OTHER;
}

function getCategoryIcon(category) {
  if (category === CATEGORY_TABLETOP) {
    return <FaDiceD20 />;
  }

  if (
    category === CATEGORY_PRODUCT ||
    category === CATEGORY_PROBLEM ||
    category === CATEGORY_LEARNING
  ) {
    return <FaBrain />;
  }

  return <FaFileAlt />;
}

function getCategoryBadgeClasses(category) {
  const classes = {
    [CATEGORY_PRODUCT]: "border-cyan-800 bg-cyan-950/50 text-cyan-300",
    [CATEGORY_TABLETOP]: "border-purple-800 bg-purple-950/50 text-purple-300",
    [CATEGORY_PROBLEM]: "border-amber-800 bg-amber-950/50 text-amber-300",
    [CATEGORY_LEARNING]: "border-sky-800 bg-sky-950/50 text-sky-300",
    [CATEGORY_LOGOS]: "border-emerald-800 bg-emerald-950/50 text-emerald-300",
  };

  return classes[category] || "border-slate-700 bg-slate-800 text-slate-300";
}

function createPreview(item) {
  if (isLearningStudioContent(item.content_type)) {
    return getLearningMaterialPreview(item.body, item.content_type);
  }

  const text = String(item.body || "")
    .replace(/[#*_>`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "No preview is available for this content.";
  }

  return text.length <= 220 ? text : `${text.slice(0, 220).trim()}…`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function getTimestamp(item) {
  const value = new Date(
    item.updated_at || item.created_at || 0
  ).getTime();

  return Number.isNaN(value) ? 0 : value;
}

function SavedDates({ item }) {
  const created = formatDate(item.created_at);
  const updated = formatDate(item.updated_at);
  const wasModified =
    item.created_at &&
    item.updated_at &&
    new Date(item.updated_at).getTime() >
      new Date(item.created_at).getTime();

  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
      {created && <span>Date Created: {created}</span>}
      {updated && wasModified && (
        <span className="text-violet-300">Date Modified: {updated}</span>
      )}
    </div>
  );
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : `The request could not be completed (${response.status}).`
    );
  }

  return data;
}

function Modal({ title, onClose, busy, children, footer, wide = false }) {
  const titleId = `modal-${title.toLowerCase().replace(/\W+/g, "-")}`;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${
          wide ? "max-w-5xl" : "max-w-xl"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <h2 id={titleId} className="text-2xl font-bold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={`Close ${title}`}
            className={BUTTON_CLASS}
            autoFocus
          >
            <FaTimes />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5">{children}</div>

        {footer && (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-800 p-5">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}

function ErrorMessage({ children }) {
  if (!children) {
    return null;
  }

  return (
    <p
      role="alert"
      className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
    >
      {children}
    </p>
  );
}

function SavedMaterial({ item, disabled }) {
  if (item.isLogo) {
    return (
      <>
        <img
          src={`data:image/png;base64,${item.image_base64}`}
          alt={`${item.title} saved logo`}
          className="mx-auto max-h-[60vh] rounded-xl border border-slate-700 bg-white object-contain"
        />
        <dl className="mt-6 space-y-3 text-sm">
          {[
            ["Style", item.style || "default"],
            ["Preferred Colors", item.preferred_colors || "Default"],
            ["Logo Ideas / Symbols", item.logo_ideas || "None"],
            ["Branding Direction", item.branding_direction || "Default"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-slate-500">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
      </>
    );
  }

  if (isLearningStudioContent(item.content_type)) {
    let material;

    try {
      material = parseLearningMaterial(item.body, item.content_type);
    } catch (error) {
      return <ErrorMessage>{error.message}</ErrorMessage>;
    }

    return (
      <>
        <dl className="space-y-3 rounded-xl bg-slate-900/60 p-4 text-sm">
          <div>
            <dt className="text-slate-400">Topic</dt>
            <dd className="mt-1 break-words text-white">{material.topic}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Experience Level</dt>
            <dd className="mt-1 capitalize text-white">
              {material.experience_level}
            </dd>
          </div>
          {material.learning_goal && (
            <div>
              <dt className="text-slate-400">Learning Goal</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-white">
                {material.learning_goal}
              </dd>
            </div>
          )}
        </dl>
        <LearningMaterialView material={material} disabled={disabled} />
      </>
    );
  }

  return (
    <div className={MARKDOWN_CLASSES}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {item.body || ""}
      </ReactMarkdown>
    </div>
  );
}

function Content() {
  const [contentItems, setContentItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_ALL);
  const [sortOption, setSortOption] = useState("newest");

  const [selectedContent, setSelectedContent] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const [editingContent, setEditingContent] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editMaterial, setEditMaterial] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [moveTarget, setMoveTarget] = useState(null);
  const [moveProjectId, setMoveProjectId] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectWorkspaceId, setNewProjectWorkspaceId] = useState("");
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteText, setDeleteText] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const libraryControllerRef = useRef(null);
  const versionsControllerRef = useRef(null);
  const actionBusyRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      libraryControllerRef.current?.abort();
      versionsControllerRef.current?.abort();
    };
  }, []);

  const loadLibrary = useCallback(async (isRefresh = false) => {
    libraryControllerRef.current?.abort();
    const controller = new AbortController();
    libraryControllerRef.current = controller;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const options = { signal: controller.signal };
      const [contents, loadedProjects, loadedWorkspaces, preserved] =
        await Promise.all([
          apiRequest("/content/", options),
          apiRequest("/projects/", options),
          apiRequest("/workspaces/", options),
          apiRequest("/projects/preserved-logos", options),
        ]);

      if (
        !Array.isArray(contents) ||
        !Array.isArray(loadedProjects) ||
        !Array.isArray(loadedWorkspaces)
      ) {
        throw new Error("The server returned invalid library information.");
      }

      const logoGroups = await Promise.all(
        loadedProjects.map(async (project) => {
          try {
            const data = await apiRequest(
              `/product-architect/logos/${project.id}`,
              options
            );

            return Array.isArray(data?.logos)
              ? data.logos.map((logo) => ({
                  ...logo,
                  id: `logo-${logo.id}`,
                  title: `${project.title} Logo`,
                  content_type: "Saved Logo",
                  body: "",
                  project_id: logo.project_id,
                  isLogo: true,
                }))
              : [];
          } catch (requestError) {
            if (controller.signal.aborted) {
              throw requestError;
            }
            return [];
          }
        })
      );

      const preservedLogos = Array.isArray(preserved?.logos)
        ? preserved.logos.map((logo) => ({
            ...logo,
            id: `logo-${logo.id}`,
            title: "Saved Logo",
            content_type: "Saved Logo",
            body: "",
            project_id: null,
            isLogo: true,
          }))
        : [];

      if (!controller.signal.aborted && mountedRef.current) {
        const uniqueItems = new Map(
          [...contents, ...logoGroups.flat(), ...preservedLogos].map(
            (item) => [String(item.id), item]
          )
        );

        setContentItems([...uniqueItems.values()]);
        setProjects(loadedProjects);
        setWorkspaces(loadedWorkspaces);
      }
    } catch (requestError) {
      if (!controller.signal.aborted && mountedRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Your Content Library could not be loaded."
        );
      }
    } finally {
      if (libraryControllerRef.current === controller) {
        libraryControllerRef.current = null;
      }

      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const preparedContent = useMemo(() => {
    const names = new Map(
      projects.map((project) => [String(project.id), project.title])
    );

    return contentItems.map((item) => ({
      ...item,
      category: item.isLogo
        ? CATEGORY_LOGOS
        : determineCategory(item.content_type),
      projectName:
        item.project_id == null
          ? "No Project"
          : names.get(String(item.project_id)) || `Project #${item.project_id}`,
    }));
  }, [contentItems, projects]);

  const categories = useMemo(() => {
    const available = new Set(preparedContent.map((item) => item.category));

    return [
      CATEGORY_ALL,
      CATEGORY_PRODUCT,
      CATEGORY_TABLETOP,
      CATEGORY_LEARNING,
      ...[CATEGORY_PROBLEM, CATEGORY_LOGOS, CATEGORY_OTHER].filter(
        (category) => available.has(category)
      ),
    ];
  }, [preparedContent]);

  const visibleContent = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const filtered = preparedContent.filter((item) => {
      if (
        selectedCategory !== CATEGORY_ALL &&
        item.category !== selectedCategory
      ) {
        return false;
      }

      return (
        !search ||
        [
          item.title, item.content_type, item.body, item.projectName,
          item.category, item.style, item.preferred_colors,
          item.logo_ideas, item.branding_direction,
        ].some((value) => String(value || "").toLowerCase().includes(search))
      );
    });

    return filtered.sort((first, second) => {
      if (sortOption === "oldest") {
        return getTimestamp(first) - getTimestamp(second);
      }
      if (sortOption === "title-asc") {
        return first.title.localeCompare(second.title);
      }
      if (sortOption === "title-desc") {
        return second.title.localeCompare(first.title);
      }
      if (sortOption === "type-asc") {
        return first.content_type.localeCompare(second.content_type);
      }
      return getTimestamp(second) - getTimestamp(first);
    });
  }, [preparedContent, searchTerm, selectedCategory, sortOption]);

  const closeView = useCallback(() => {
    if (actionBusyRef.current) {
      return;
    }

    versionsControllerRef.current?.abort();
    setSelectedContent(null);
    setVersions([]);
    setSelectedVersionId("");
    setVersionsLoading(false);
    setVersionsError("");
    setRestoreMessage("");
    setExportError("");
  }, []);

  const loadVersions = async (item) => {
    versionsControllerRef.current?.abort();
    const controller = new AbortController();
    versionsControllerRef.current = controller;
    setVersionsLoading(true);
    setVersionsError("");

    try {
      const data = await apiRequest(`/content/${item.id}/versions`, {
        signal: controller.signal,
      });

      if (!Array.isArray(data)) {
        throw new Error("The server returned invalid version information.");
      }

      if (!controller.signal.aborted && mountedRef.current) {
        setVersions(
          [...data].sort((a, b) => a.version_number - b.version_number)
        );

        // Problem Solver uses saved versions for its generated history.
        // Learning Studio opens the active content by default.
        if (item.category === CATEGORY_PROBLEM && data.length > 0) {
          const latest = [...data].sort(
            (a, b) => b.version_number - a.version_number
          )[0];
          setSelectedVersionId(String(latest.id));
        }
      }
    } catch (requestError) {
      if (!controller.signal.aborted && mountedRef.current) {
        setVersionsError(requestError.message);
      }
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setVersionsLoading(false);
      }
    }
  };

  const openView = (item) => {
    setSelectedContent(item);
    setVersions([]);
    setSelectedVersionId("");
    setVersionsError("");
    setRestoreMessage("");
    setExportError("");

    if (!item.isLogo) {
      loadVersions(item);
    }
  };

  const selectedVersion = versions.find(
    (version) => String(version.id) === selectedVersionId
  );

  const displayedContent = selectedContent
    ? selectedVersion
      ? {
          ...selectedContent,
          title: selectedVersion.title,
          content_type: selectedVersion.content_type,
          body: selectedVersion.body,
        }
      : selectedContent
    : null;

  const replaceContent = (updated) => {
    setContentItems((items) =>
      items.map((item) =>
        String(item.id) === String(updated.id) ? updated : item
      )
    );
  };

  const restoreVersion = async () => {
    if (!selectedVersion || actionBusyRef.current) {
      return;
    }

    actionBusyRef.current = true;
    setRestoreLoading(true);
    setVersionsError("");
    setRestoreMessage("");

    try {
      const updated = await apiRequest(
        `/content/versions/${selectedVersion.id}/restore`,
        { method: "POST" }
      );

      if (!updated?.id) {
        throw new Error("The server did not confirm the restored content.");
      }

      if (!mountedRef.current) {
        return;
      }

      const prepared = {
        ...selectedContent,
        ...updated,
        category: determineCategory(updated.content_type),
      };

      replaceContent(updated);
      setSelectedContent(prepared);
      await loadVersions(prepared);

      if (mountedRef.current) {
        setSelectedVersionId("");
        setRestoreMessage(
          "Version restored. The previous active content was preserved in history."
        );
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setVersionsError(requestError.message);
      }
    } finally {
      actionBusyRef.current = false;
      if (mountedRef.current) {
        setRestoreLoading(false);
      }
    }
  };

  const downloadLogo = (item) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${item.image_base64}`;
    link.download = getLearningMaterialFileName(item.title, "png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportContent = async (format) => {
    if (!displayedContent || actionBusyRef.current) {
      return;
    }

    actionBusyRef.current = true;
    setExporting(true);
    setExportError("");

    try {
      const item = displayedContent;
      const body = isLearningStudioContent(item.content_type)
        ? learningMaterialToMarkdown(
            parseLearningMaterial(item.body, item.content_type)
          )
        : item.body;

      const fileName = getLearningMaterialFileName(item.title, format);

      if (format === "pdf") {
        exportContentAsPdf(item.title, body, fileName);
      } else if (format === "md") {
        exportContentAsMarkdown(item.title, body, fileName);
      } else if (format === "txt") {
        exportContentAsTxt(item.title, body, fileName);
      } else if (format === "docx") {
        await exportContentAsDocx(item.title, body, fileName);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setExportError(requestError.message);
      }
    } finally {
      actionBusyRef.current = false;
      if (mountedRef.current) {
        setExporting(false);
      }
    }
  };

  const openEdit = (item) => {
    let material = null;
    let parsingError = "";

    if (isLearningStudioContent(item.content_type)) {
      try {
        material = parseLearningMaterial(item.body, item.content_type);
      } catch (requestError) {
        parsingError = requestError.message;
      }
    }

    setEditingContent(item);
    setEditTitle(item.title || "");
    setEditBody(item.body || "");
    setEditMaterial(material);
    setEditError(parsingError);
  };

  const closeEdit = () => {
    if (!actionBusyRef.current) {
      setEditingContent(null);
      setEditMaterial(null);
      setEditError("");
    }
  };

  const saveEdits = async (event) => {
    event.preventDefault();

    if (!editingContent || actionBusyRef.current) {
      return;
    }

    setEditError("");
    const title = editTitle.trim();
    let body;

    try {
      if (!title) {
        throw new Error("Content title is required.");
      }

      body = isLearningStudioContent(editingContent.content_type)
        ? serializeLearningMaterial(editMaterial)
        : editBody.trim();

      if (!body) {
        throw new Error("Content body is required.");
      }
    } catch (requestError) {
      setEditError(requestError.message);
      return;
    }

    actionBusyRef.current = true;
    setEditLoading(true);

    try {
      const updated = await apiRequest(`/content/${editingContent.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, body }),
      });

      if (!updated?.id) {
        throw new Error("The server did not confirm the saved changes.");
      }

      if (mountedRef.current) {
        replaceContent(updated);
        setEditingContent(null);
        setEditMaterial(null);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setEditError(requestError.message);
      }
    } finally {
      actionBusyRef.current = false;
      if (mountedRef.current) {
        setEditLoading(false);
      }
    }
  };

  const openMove = (item) => {
    setMoveTarget(item);
    setMoveProjectId(String(item.project_id || ""));
    setMoveError("");
    setShowCreateProject(false);
    setShowCreateWorkspace(false);
    setNewProjectTitle("");
    setNewProjectDescription("");
    setNewProjectWorkspaceId("");
    setNewWorkspaceName("");
    setNewWorkspaceDescription("");
  };

  const closeMove = () => {
    if (!actionBusyRef.current) {
      setMoveTarget(null);
      setMoveError("");
    }
  };

  const createWorkspace = async () => {
    if (actionBusyRef.current || !newWorkspaceName.trim()) {
      return;
    }

    actionBusyRef.current = true;
    setMoveLoading(true);
    setMoveError("");

    try {
      const workspace = await apiRequest("/workspaces/", {
        method: "POST",
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          description: newWorkspaceDescription.trim() || null,
        }),
      });

      if (!workspace?.id) {
        throw new Error("The workspace could not be confirmed.");
      }

      if (mountedRef.current) {
        setWorkspaces((items) => [workspace, ...items]);
        setNewProjectWorkspaceId(String(workspace.id));
        setShowCreateWorkspace(false);
        setNewWorkspaceName("");
        setNewWorkspaceDescription("");
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setMoveError(requestError.message);
      }
    } finally {
      actionBusyRef.current = false;
      if (mountedRef.current) {
        setMoveLoading(false);
      }
    }
  };

  const createProject = async () => {
    if (actionBusyRef.current) {
      return;
    }

    const title = newProjectTitle.trim();
    const description = newProjectDescription.trim();

    if (
      title.length < 2 ||
      title.length > 100 ||
      description.length > 5000 ||
      !newProjectWorkspaceId
    ) {
      setMoveError(
        "Enter a project name with 2–100 characters, a description of at most 5,000 characters, and choose a workspace."
      );
      return;
    }

    actionBusyRef.current = true;
    setMoveLoading(true);
    setMoveError("");

    try {
      const project = await apiRequest("/projects/", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          workspace_id: Number(newProjectWorkspaceId),
        }),
      });

      if (!project?.id) {
        throw new Error("The project could not be confirmed.");
      }

      if (mountedRef.current) {
        setProjects((items) => [project, ...items]);
        setMoveProjectId(String(project.id));
        setShowCreateProject(false);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setMoveError(requestError.message);
      }
    } finally {
      actionBusyRef.current = false;
      if (mountedRef.current) {
        setMoveLoading(false);
      }
    }
  };

  const moveContent = async () => {
    if (!moveTarget || !moveProjectId || actionBusyRef.current) {
      return;
    }

    if (!projects.some((project) => String(project.id) === moveProjectId)) {
      setMoveError("Choose one of your projects.");
      return;
    }

    actionBusyRef.current = true;
    setMoveLoading(true);
    setMoveError("");

    try {
      const path = moveTarget.isLogo
        ? `/product-architect/logos/${String(moveTarget.id).replace("logo-", "")}`
        : `/content/${moveTarget.id}`;

      await apiRequest(path, {
        method: "PUT",
        body: JSON.stringify({ project_id: Number(moveProjectId) }),
      });

      if (mountedRef.current) {
        setMoveTarget(null);
        await loadLibrary(true);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setMoveError(requestError.message);
      }
    } finally {
      actionBusyRef.current = false;
      if (mountedRef.current) {
        setMoveLoading(false);
      }
    }
  };

  const openDelete = (item) => {
    setDeleteTarget(item);
    setDeleteText("");
    setDeleteConfirmed(false);
    setDeleteError("");
  };

  const closeDelete = () => {
    if (!actionBusyRef.current) {
      setDeleteTarget(null);
      setDeleteError("");
    }
  };

  const deleteContent = async () => {
    if (
      !deleteTarget ||
      deleteText !== "DELETE" ||
      !deleteConfirmed ||
      actionBusyRef.current
    ) {
      return;
    }

    actionBusyRef.current = true;
    setDeleteLoading(true);
    setDeleteError("");

    try {
      const path = deleteTarget.isLogo
        ? `/product-architect/logos/${String(deleteTarget.id).replace("logo-", "")}`
        : `/content/${deleteTarget.id}`;

      await apiRequest(path, { method: "DELETE" });

      if (mountedRef.current) {
        setContentItems((items) =>
          items.filter((item) => String(item.id) !== String(deleteTarget.id))
        );
        setDeleteTarget(null);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setDeleteError(requestError.message);
      }
    } finally {
      actionBusyRef.current = false;
      if (mountedRef.current) {
        setDeleteLoading(false);
      }
    }
  };

  const viewBusy = restoreLoading || exporting;

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-slate-900 p-6">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <FaFolderOpen className="text-cyan-400" />
            Content Vault
          </h1>
          <p className="mt-2 text-slate-400">
            Revisit, edit, organize, and export your saved Tanio content.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadLibrary(true)}
          disabled={loading || refreshing}
          className={`${BUTTON_CLASS} inline-flex items-center gap-2`}
        >
          <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="content-search" className="mb-2 block text-sm">
              Search saved content
            </label>
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-4 text-slate-500" />
              <input
                id="content-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title, topic, type, or project..."
                className={`${FIELD_CLASS} pl-10`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="content-sort" className="mb-2 block text-sm">
              Sort by
            </label>
            <select
              id="content-sort"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              className={FIELD_CLASS}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title-asc">Title A–Z</option>
              <option value="title-desc">Title Z–A</option>
              <option value="type-asc">Content type A–Z</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Content categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={
                selectedCategory === category ? PRIMARY_BUTTON : BUTTON_CLASS
              }
            >
              {category}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory(CATEGORY_ALL);
            }}
            className={BUTTON_CLASS}
          >
            Clear Filters
          </button>
        </div>
      </section>

      <ErrorMessage>{error}</ErrorMessage>

      {loading ? (
        <p role="status" className="mt-6 text-slate-400">
          Loading saved content...
        </p>
      ) : visibleContent.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
          No saved content matches your filters.
        </p>
      ) : (
        <>
          <p className="mt-5 text-sm text-slate-400">
            {visibleContent.length} saved{" "}
            {visibleContent.length === 1 ? "item" : "items"}
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleContent.map((item) => (
              <article
                key={item.id}
                className="flex min-w-0 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl text-cyan-300">
                    {getCategoryIcon(item.category)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${getCategoryBadgeClasses(item.category)}`}
                  >
                    {item.category}
                  </span>
                </div>
                <h2 className="mt-4 break-words text-xl font-bold">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-400">{item.content_type}</p>
                <p className="mt-2 text-sm text-slate-500">{item.projectName}</p>
                <SavedDates item={item} />

                {item.isLogo ? (
                  <img
                    src={`data:image/png;base64,${item.image_base64}`}
                    alt={item.title}
                    className="mt-4 h-48 w-full rounded-lg bg-white object-contain"
                  />
                ) : (
                  <p className="mt-4 flex-1 break-words text-sm leading-6 text-slate-400">
                    {createPreview(item)}
                  </p>
                )}

                <div className="mt-5 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => openView(item)}
                    className={`${PRIMARY_BUTTON} mb-3 flex w-full items-center justify-center gap-2`}
                  >
                    <FaEye /> View
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {item.isLogo ? (
                      <button
                        type="button"
                        onClick={() => downloadLogo(item)}
                        className={BUTTON_CLASS}
                      >
                        Download
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className={BUTTON_CLASS}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openMove(item)}
                      className={BUTTON_CLASS}
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(item)}
                      className="ml-auto rounded-lg bg-red-800 px-4 py-2 font-semibold hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {selectedContent && (
        <Modal
          title="Saved Content"
          wide
          busy={viewBusy}
          onClose={closeView}
          footer={
            <>
              {selectedContent.isLogo ? (
                <button
                  type="button"
                  onClick={() => downloadLogo(selectedContent)}
                  className={PRIMARY_BUTTON}
                >
                  <FaDownload className="mr-2 inline" />
                  Download Image
                </button>
              ) : (
                <>
                  {[
                    ["pdf", "PDF"], ["md", "Markdown"],
                    ["txt", "TXT"], ["docx", "DOCX"],
                  ].map(([format, label]) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => exportContent(format)}
                      disabled={viewBusy || versionsLoading}
                      className={BUTTON_CLASS}
                    >
                      Export {label}
                    </button>
                  ))}
                </>
              )}
              <button
                type="button"
                onClick={closeView}
                disabled={viewBusy}
                className={BUTTON_CLASS}
              >
                Close
              </button>
            </>
          }
        >
          <h3 className="break-words text-2xl font-bold">
            {displayedContent.title}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            {displayedContent.content_type} · {selectedContent.projectName}
          </p>
          <SavedDates item={selectedContent} />

          {!selectedContent.isLogo && (
            <section className="mt-5 rounded-xl border border-slate-700 p-4">
              <h4 className="font-bold">Version History</h4>
              <p className="mt-2 text-sm text-slate-400">
                View the active material or a preserved version.
                Restoring keeps a snapshot of the active material.
              </p>

              {versionsLoading ? (
                <p role="status" className="mt-3 text-sm text-slate-400">
                  Loading versions...
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVersionId("");
                      setExportError("");
                    }}
                    disabled={viewBusy}
                    className={!selectedVersionId ? PRIMARY_BUTTON : BUTTON_CLASS}
                  >
                    Current Material
                  </button>
                  {versions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => {
                        setSelectedVersionId(String(version.id));
                        setRestoreMessage("");
                        setExportError("");
                      }}
                      disabled={viewBusy}
                      className={
                        selectedVersionId === String(version.id)
                          ? PRIMARY_BUTTON
                          : BUTTON_CLASS
                      }
                    >
                      Version {version.version_number}
                    </button>
                  ))}
                </div>
              )}

              {!versionsLoading && versions.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">
                  No previous versions yet. Editing and saving creates history.
                </p>
              )}

              {selectedVersion?.regeneration_instructions && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                  {selectedVersion.regeneration_instructions}
                </p>
              )}

              {selectedVersion && (
                <button
                  type="button"
                  onClick={restoreVersion}
                  disabled={viewBusy || versionsLoading}
                  className={`${BUTTON_CLASS} mt-4`}
                >
                  {restoreLoading ? "Restoring..." : "Restore This Version"}
                </button>
              )}

              <ErrorMessage>{versionsError}</ErrorMessage>
              {versionsError && (
                <button
                  type="button"
                  onClick={() => loadVersions(selectedContent)}
                  disabled={viewBusy || versionsLoading}
                  className={`${BUTTON_CLASS} mt-3`}
                >
                  Retry Version History
                </button>
              )}
              {restoreMessage && (
                <p role="status" className="mt-3 text-sm text-emerald-300">
                  {restoreMessage}
                </p>
              )}
            </section>
          )}

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <SavedMaterial
              key={`${selectedContent.id}-${selectedVersionId}-${displayedContent.body}`}
              item={displayedContent}
              disabled={viewBusy}
            />
          </div>

          {isLearningStudioContent(displayedContent.content_type) && (
            <p className="mt-4 text-xs leading-6 text-slate-400">
              Quiz exports include all choices, correct answers, and explanations.
              Flashcard exports include both questions and answers.
            </p>
          )}
          {exporting && (
            <p role="status" className="mt-3 text-sm text-cyan-200">
              Preparing your export...
            </p>
          )}
          <ErrorMessage>{exportError}</ErrorMessage>
        </Modal>
      )}

      {editingContent && (
        <Modal
          title="Edit Saved Content"
          wide
          busy={editLoading}
          onClose={closeEdit}
          footer={
            <>
              <button
                type="button"
                onClick={closeEdit}
                disabled={editLoading}
                className={BUTTON_CLASS}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="content-edit-form"
                disabled={
                  editLoading ||
                  !editTitle.trim() ||
                  (isLearningStudioContent(editingContent.content_type)
                    ? !editMaterial
                    : !editBody.trim())
                }
                className={PRIMARY_BUTTON}
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </>
          }
        >
          <form id="content-edit-form" onSubmit={saveEdits} noValidate>
            <label htmlFor="edit-title" className="mb-2 block text-sm font-semibold">
              Saved Title
            </label>
            <input
              id="edit-title"
              value={editTitle}
              onChange={(event) => {
                setEditTitle(event.target.value);
                setEditError("");
              }}
              disabled={editLoading}
              className={FIELD_CLASS}
            />

            <div className="mt-5">
              {isLearningStudioContent(editingContent.content_type) ? (
                editMaterial ? (
                  <LearningMaterialEditor
                    material={editMaterial}
                    onChange={(material) => {
                      setEditMaterial(material);
                      setEditError("");
                    }}
                    disabled={editLoading}
                  />
                ) : (
                  <p className="text-sm text-red-300">
                    This material cannot be edited because its saved structure is invalid.
                  </p>
                )
              ) : (
                <>
                  <FormattingHelp />
                  <label
                    htmlFor="edit-body"
                    className="mb-2 mt-4 block text-sm font-semibold"
                  >
                    Content Body
                  </label>
                  <textarea
                    id="edit-body"
                    value={editBody}
                    onChange={(event) => {
                      setEditBody(event.target.value);
                      setEditError("");
                    }}
                    disabled={editLoading}
                    rows={18}
                    className={`${FIELD_CLASS} font-mono text-sm leading-6`}
                  />
                </>
              )}
            </div>
            <ErrorMessage>{editError}</ErrorMessage>
          </form>
        </Modal>
      )}

      {moveTarget && (
        <Modal
          title="Move Content"
          busy={moveLoading}
          onClose={closeMove}
          footer={
            <>
              <button
                type="button"
                onClick={closeMove}
                disabled={moveLoading}
                className={BUTTON_CLASS}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={moveContent}
                disabled={moveLoading || !moveProjectId || showCreateProject}
                className={PRIMARY_BUTTON}
              >
                {moveLoading ? "Working..." : "Move Content"}
              </button>
            </>
          }
        >
          <p className="break-words font-semibold">{moveTarget.title}</p>
          <p className="mt-2 text-sm text-slate-400">
            Current project: {moveTarget.projectName}
          </p>

          <button
            type="button"
            onClick={() => {
              setShowCreateProject((value) => !value);
              setMoveError("");
            }}
            disabled={moveLoading}
            className={`${BUTTON_CLASS} mt-4`}
          >
            {showCreateProject ? "Choose Existing Project" : "Create New Project"}
          </button>

          {!showCreateProject ? (
            <div className="mt-4">
              <label htmlFor="move-project" className="mb-2 block text-sm">
                Destination Project
              </label>
              <select
                id="move-project"
                value={moveProjectId}
                onChange={(event) => setMoveProjectId(event.target.value)}
                disabled={moveLoading}
                className={FIELD_CLASS}
              >
                <option value="">Choose a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} — Workspace {project.workspace_id}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="new-project-title" className="mb-2 block text-sm">
                  New Project Name
                </label>
                <input
                  id="new-project-title"
                  value={newProjectTitle}
                  onChange={(event) => setNewProjectTitle(event.target.value)}
                  maxLength={100}
                  disabled={moveLoading}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label htmlFor="new-project-description" className="mb-2 block text-sm">
                  Project Description
                </label>
                <textarea
                  id="new-project-description"
                  value={newProjectDescription}
                  onChange={(event) => setNewProjectDescription(event.target.value)}
                  maxLength={5000}
                  rows={3}
                  disabled={moveLoading}
                  className={FIELD_CLASS}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowCreateWorkspace((value) => !value)}
                disabled={moveLoading}
                className={BUTTON_CLASS}
              >
                {showCreateWorkspace
                  ? "Choose Existing Workspace"
                  : "Create New Workspace"}
              </button>

              {showCreateWorkspace ? (
                <div className="space-y-4 rounded-xl border border-slate-700 p-4">
                  <div>
                    <label htmlFor="new-workspace-name" className="mb-2 block text-sm">
                      New Workspace Name
                    </label>
                    <input
                      id="new-workspace-name"
                      value={newWorkspaceName}
                      onChange={(event) => setNewWorkspaceName(event.target.value)}
                      disabled={moveLoading}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-workspace-description" className="mb-2 block text-sm">
                      Workspace Description
                    </label>
                    <textarea
                      id="new-workspace-description"
                      value={newWorkspaceDescription}
                      onChange={(event) =>
                        setNewWorkspaceDescription(event.target.value)
                      }
                      rows={3}
                      disabled={moveLoading}
                      className={FIELD_CLASS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={createWorkspace}
                    disabled={moveLoading || !newWorkspaceName.trim()}
                    className={PRIMARY_BUTTON}
                  >
                    Create Workspace
                  </button>
                </div>
              ) : (
                <div>
                  <label htmlFor="new-project-workspace" className="mb-2 block text-sm">
                    Workspace
                  </label>
                  <select
                    id="new-project-workspace"
                    value={newProjectWorkspaceId}
                    onChange={(event) =>
                      setNewProjectWorkspaceId(event.target.value)
                    }
                    disabled={moveLoading}
                    className={FIELD_CLASS}
                  >
                    <option value="">Choose a workspace</option>
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name || `Workspace #${workspace.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={createProject}
                disabled={
                  moveLoading ||
                  showCreateWorkspace ||
                  !newProjectTitle.trim() ||
                  !newProjectWorkspaceId
                }
                className={PRIMARY_BUTTON}
              >
                Create Project
              </button>
            </div>
          )}
          <ErrorMessage>{moveError}</ErrorMessage>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete This Item?"
          busy={deleteLoading}
          onClose={closeDelete}
          footer={
            <>
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleteLoading}
                className={BUTTON_CLASS}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteContent}
                disabled={
                  deleteLoading ||
                  deleteText !== "DELETE" ||
                  !deleteConfirmed
                }
                className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </>
          }
        >
          <p className="break-words font-semibold">{deleteTarget.title}</p>
          <p className="mt-2 text-sm text-slate-400">
            {deleteTarget.content_type} · {deleteTarget.projectName}
          </p>
          <p className="mt-4 text-sm leading-6 text-red-300">
            This permanently deletes the item and its saved versions.
          </p>
          <label htmlFor="delete-confirmation" className="mb-2 mt-5 block text-sm">
            Type DELETE to confirm.
          </label>
          <input
            id="delete-confirmation"
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            disabled={deleteLoading}
            className={FIELD_CLASS}
          />
          <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-red-200">
            <input
              type="checkbox"
              checked={deleteConfirmed}
              onChange={(event) => setDeleteConfirmed(event.target.checked)}
              disabled={deleteLoading}
              className="mt-1"
            />
            <span>I understand this item will be permanently deleted.</span>
          </label>
          <ErrorMessage>{deleteError}</ErrorMessage>
        </Modal>
      )}
    </main>
  );
}

export default Content;