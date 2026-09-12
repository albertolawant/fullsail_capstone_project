import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFolder,
  FaPlus,
  FaSyncAlt,
  FaEdit,
  FaTrash,
  FaTimes,
  FaArrowRight,
  FaExclamationTriangle,
} from "react-icons/fa";

import { notifyWorkspaceCreated } from "../utils/notifications";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const SORT_NEWEST = "newest";
const SORT_OLDEST = "oldest";
const SORT_NAME_ASC = "name-asc";
const SORT_NAME_DESC = "name-desc";  

function getWorkspaceSortTime(workspace) {
  const value =
    workspace.updated_at ||
    workspace.updatedAt ||
    workspace.created_at ||
    workspace.createdAt;

  const time = value ? new Date(value).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
}

function sortWorkspaces(workspaceList = [], sortOption = SORT_NEWEST) {
  return [...workspaceList].sort((firstWorkspace, secondWorkspace) => {
    const firstSortTime = getWorkspaceSortTime(firstWorkspace);
    const secondSortTime = getWorkspaceSortTime(secondWorkspace);

    const firstName = (firstWorkspace.name || "").toLowerCase();
    const secondName = (secondWorkspace.name || "").toLowerCase();

    if (sortOption === SORT_OLDEST) {
      return firstSortTime - secondSortTime;
    }

    if (sortOption === SORT_NAME_ASC) {
      return firstName.localeCompare(secondName);
    }

    if (sortOption === SORT_NAME_DESC) {
      return secondName.localeCompare(firstName);
    }

    if (firstSortTime !== secondSortTime) {
      return secondSortTime - firstSortTime;
    }

    return Number(secondWorkspace.id || 0) - Number(firstWorkspace.id || 0);
  });
}

function Workspaces() {
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [workspaceSortOption, setWorkspaceSortOption] = useState(SORT_NEWEST);

  const [showModal, setShowModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Workspace deletion confirmation
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteTextConfirmation, setDeleteTextConfirmation] = useState("");
  const [deleteFinalConfirmed, setDeleteFinalConfirmed] = useState(false);
  const [deleteContentChoice, setDeleteContentChoice] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const getRequestOptions = () => {
    const token = localStorage.getItem("token");

    return {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const loadWorkspaces = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please sign in to view your workspaces.");
      }

      const response = await fetch(`${API_BASE_URL}/workspaces/`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
          errorData?.detail || "Unable to load your workspaces."
        );
      }

      const data = await response.json();
      setWorkspaces(data);
    } catch (err) {
      setError(err.message || "Unable to load your workspaces.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const sortedWorkspaces = useMemo(() => {
    return sortWorkspaces(workspaces, workspaceSortOption);
  }, [workspaces, workspaceSortOption]);

  const openCreateModal = () => {
    setEditingWorkspace(null);
    setName("");
    setDescription("");
    setError("");
    setShowModal(true);
  };

  const openEditModal = (workspace) => {
    setEditingWorkspace(workspace);
    setName(workspace.name);
    setDescription(workspace.description || "");
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingWorkspace(null);
    setName("");
    setDescription("");
    setError("");
  };

  const handleOpenWorkspace = (workspace) => {
    navigate(`/projects?workspace=${workspace.id}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Workspace name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const endpoint = editingWorkspace
        ? `${API_BASE_URL}/workspaces/${editingWorkspace.id}`
        : `${API_BASE_URL}/workspaces/`;

      const method = editingWorkspace ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        ...getRequestOptions(),
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
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
          errorData?.detail ||
            `Unable to ${
              editingWorkspace ? "update" : "create"
            } workspace.`
        );
      }

      // Only create a notification for a brand-new workspace.
      // Editing an existing workspace will not create one.
      if (!editingWorkspace) {
        notifyWorkspaceCreated(trimmedName);
      }

      await loadWorkspaces(true);

      setShowModal(false);
      setEditingWorkspace(null);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err.message || "Unable to save workspace.");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (workspace) => {
    setWorkspaceToDelete(workspace);
    setDeleteConfirmation("");
    setDeleteTextConfirmation("");
    setDeleteFinalConfirmed(false);
    setDeleteContentChoice("");
    setDeleteError("");
    setError("");
  };

  const closeDeleteModal = () => {
    if (deleting) {
      return;
    }

    setWorkspaceToDelete(null);
    setDeleteConfirmation("");
    setDeleteTextConfirmation("");
    setDeleteFinalConfirmed(false);
    setDeleteContentChoice("");
    setDeleteError("");
  };

  const handleDelete = async () => {
    if (!workspaceToDelete) {
      return;
    }

    if (!deleteConfirmationMatches) {
      setDeleteError(
        "Choose a delete option, type the workspace name, type DELETE, and check the final confirmation."
      );
      return;
    }

    const workspace = workspaceToDelete;

    setDeleting(true);
    setDeleteError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please sign in to delete this workspace.");
      }

      const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspace.id}?delete_content_choice=${deleteContentChoice}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
          errorData?.detail || "Unable to delete workspace."
        );
      }

      setWorkspaces((currentWorkspaces) =>
        currentWorkspaces.filter(
          (currentWorkspace) =>
            currentWorkspace.id !== workspace.id
        )
      );

      setWorkspaceToDelete(null);
      setDeleteConfirmation("");
      setDeleteTextConfirmation("");
      setDeleteFinalConfirmed(false);
      setDeleteContentChoice("");
      setDeleteError("");
    } catch (err) {
      setDeleteError(
        err.message || "Unable to delete workspace."
      );
    } finally {
      setDeleting(false);
    }
  };

  const deleteConfirmationMatches =
    workspaceToDelete &&
    deleteConfirmation.trim() === workspaceToDelete.name &&
    deleteTextConfirmation.trim() === "DELETE" &&
    deleteFinalConfirmed &&
    deleteContentChoice;
  return (
    <main className="flex-1 px-10 py-10">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">
            Workspaces
          </h1>

          <p className="mt-2 text-slate-400">
            Organize your projects into dedicated workspaces.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => loadWorkspaces(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSyncAlt
              className={refreshing ? "animate-spin" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <FaPlus />
            New Workspace
          </button>
        </div>
      </div>

      {/* Error */}
      {error && !showModal && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <section className="flex min-h-72 items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-center">
            <FaSyncAlt className="mx-auto mb-4 animate-spin text-3xl text-cyan-400" />

            <p className="text-slate-400">
              Loading workspaces...
            </p>
          </div>
        </section>
      )}

      {/* Workspace Sort Controls */}
      {!loading && !error && workspaces.length > 0 && (
        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <label
              htmlFor="workspace-sort"
              className="text-sm font-semibold text-slate-300"
            >
              Sort Workspaces
            </label>

            <select
              id="workspace-sort"
              value={workspaceSortOption}
              onChange={(event) => setWorkspaceSortOption(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-500"
            >
              <option value={SORT_NEWEST}>Newest First</option>
              <option value={SORT_OLDEST}>Oldest First</option>
              <option value={SORT_NAME_ASC}>Name A-Z</option>
              <option value={SORT_NAME_DESC}>Name Z-A</option>
            </select>
          </div>
        </section>
      )}

      {!loading && !error && workspaces.length === 0 && (
        <section className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-8">
          <div className="max-w-lg text-center">
            <FaFolder className="mx-auto mb-5 text-5xl text-slate-500" />

            <h2 className="text-2xl font-bold text-white">
              No workspaces yet
            </h2>

            <p className="mt-2 text-slate-400">
              Create your first workspace to organize your Tanio AI
              projects.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              <FaPlus />
              Create Workspace
            </button>
          </div>
        </section>
      )}

      {/* Workspace Cards */}
      {!loading && workspaces.length > 0 && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedWorkspaces.map((workspace) => (
            <article
              key={workspace.id}
              className="flex min-h-64 flex-col rounded-xl border border-slate-800 bg-slate-900 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-700/40 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-700/50 bg-cyan-950/40 text-lg text-cyan-400">
                    <FaFolder />
                  </div>

                  <h2 className="text-xl font-bold text-white">
                    {workspace.name}
                  </h2>
                </div>

                <span className="text-xs font-medium text-slate-500">
                  Workspace #{workspace.id}
                </span>
              </div>

              <p className="mt-4 flex-1 text-sm leading-6 text-slate-400">
                {workspace.description ||
                  "No description has been added to this workspace."}
              </p>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenWorkspace(workspace)
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Open Workspace
                  <FaArrowRight className="text-xs" />
                </button>

                <div className="flex items-center justify-center gap-4 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openEditModal(workspace)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
                  >
                    <FaEdit />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openDeleteModal(workspace)
                    }
                    className="flex items-center gap-2 text-sm font-medium text-red-400 transition hover:text-red-300"
                  >
                    <FaTrash />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 p-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editingWorkspace
                    ? "Edit Workspace"
                    : "Create Workspace"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {editingWorkspace
                    ? "Update your workspace details."
                    : "Create a workspace to organize your projects."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg bg-slate-800 p-3 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="workspace-name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Workspace Name
                </label>

                <input
                  id="workspace-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Example: Personal Projects"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="workspace-description"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Description
                </label>

                <textarea
                  id="workspace-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Describe what this workspace will be used for..."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingWorkspace
                      ? "Save Changes"
                      : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Workspace Modal */}
      {workspaceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-red-500/30 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-xl text-red-400">
                  <FaExclamationTriangle />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Delete Workspace?
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="rounded-lg bg-slate-800 p-3 text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm leading-6 text-red-200">
                  Deleting{" "}
                  <span className="font-bold text-white">
                    {workspaceToDelete.name}
                  </span>{" "}
                  will delete this workspace and the projects inside it. Choose what should happen to the saved content.
                </p>
              </div>

              <div className="space-y-3">
                <label
                  className={`block cursor-pointer rounded-xl border p-4 transition ${
                    deleteContentChoice === "delete-all"
                      ? "border-red-500 bg-red-950/30"
                      : "border-slate-700 bg-slate-950/40 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="workspace-delete-content-choice"
                      value="delete-all"
                      checked={deleteContentChoice === "delete-all"}
                      onChange={() => {
                        setDeleteContentChoice("delete-all");
                        setDeleteError("");
                      }}
                      disabled={deleting}
                      className="mt-1 h-4 w-4 accent-red-500"
                    />

                    <div>
                      <p className="font-semibold text-red-300">
                        Delete Everything
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        Delete the workspace, projects, saved content, saved images, and saved versions.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block cursor-pointer rounded-xl border p-4 transition ${
                    deleteContentChoice === "workspace-only"
                      ? "border-cyan-500 bg-cyan-950/30"
                      : "border-slate-700 bg-slate-950/40 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="workspace-delete-content-choice"
                      value="workspace-only"
                      checked={deleteContentChoice === "workspace-only"}
                      onChange={() => {
                        setDeleteContentChoice("workspace-only");
                        setDeleteError("");
                      }}
                      disabled={deleting}
                      className="mt-1 h-4 w-4 accent-cyan-500"
                    />

                    <div>
                      <p className="font-semibold text-white">
                        Delete Workspace Only
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        Delete just the workspace, but keep the projects and saved content.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block cursor-pointer rounded-xl border p-4 transition ${
                    deleteContentChoice === "delete-projects-keep-content"
                      ? "border-amber-500 bg-amber-950/30"
                      : "border-slate-700 bg-slate-950/40 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="workspace-delete-content-choice"
                      value="delete-projects-keep-content"
                      checked={deleteContentChoice === "delete-projects-keep-content"}
                      onChange={() => {
                        setDeleteContentChoice("delete-projects-keep-content");
                        setDeleteError("");
                      }}
                      disabled={deleting}
                      className="mt-1 h-4 w-4 accent-amber-500"
                    />

                    <div>
                      <p className="font-semibold text-amber-200">
                        Delete Workspace and Projects
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        Delete the workspace and projects, but keep saved content in the Content Library.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <p className="mb-3 text-sm leading-6 text-slate-300">
                  To confirm, type{" "}
                  <span className="font-bold text-white">
                    {workspaceToDelete.name}
                  </span>{" "}
                  below.
                </p>

                <label
                  htmlFor="delete-workspace-confirmation"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Workspace Name
                </label>

                <input
                  id="delete-workspace-confirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(event) =>
                    setDeleteConfirmation(event.target.value)
                  }
                  disabled={deleting}
                  placeholder={workspaceToDelete.name}
                  autoComplete="off"
                  autoFocus
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div>
                  <p className="mb-3 text-sm leading-6 text-slate-300">
                    Then type{" "}
                    <span className="font-bold text-white">
                      DELETE
                    </span>{" "}
                    to confirm this destructive action.
                  </p>

                  <label
                    htmlFor="delete-workspace-text-confirmation"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Delete Confirmation
                  </label>

                  <input
                    id="delete-workspace-text-confirmation"
                    type="text"
                    value={deleteTextConfirmation}
                    onChange={(event) =>
                      setDeleteTextConfirmation(event.target.value)
                    }
                    disabled={deleting}
                    placeholder="DELETE"
                    autoComplete="off"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
                  <input
                    type="checkbox"
                    checked={deleteFinalConfirmed}
                    onChange={(event) =>
                      setDeleteFinalConfirmed(event.target.checked)
                    }
                    disabled={deleting}
                    className="mt-1"
                  />

                  <span>
                    I understand this will delete the workspace and affect the projects inside it based on the option I selected.
                  </span>
                </label>
              </div>

              {deleteError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {deleteError}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="rounded-lg bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    !deleteConfirmationMatches || deleting
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-950 disabled:text-red-400 disabled:opacity-60"
                >
                  {deleting ? (
                    <>
                      <FaSyncAlt className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Delete Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Workspaces;