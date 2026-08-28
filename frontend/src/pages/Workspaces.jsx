import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaFolder,
  FaPlus,
  FaSyncAlt,
  FaEdit,
  FaTrash,
  FaTimes,
  FaArrowRight,
} from "react-icons/fa";

import { notifyWorkspaceCreated } from "../utils/notifications";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function Workspaces() {
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleDelete = async (workspace) => {
    const confirmed = window.confirm(
      `Delete the workspace "${workspace.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspace.id}`,
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
    } catch (err) {
      setError(err.message || "Unable to delete workspace.");
    }
  };

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

      {/* Empty State */}
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
          {workspaces.map((workspace) => (
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
                  onClick={() => handleOpenWorkspace(workspace)}
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
                    onClick={() => handleDelete(workspace)}
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
    </main>
  );
}

export default Workspaces;