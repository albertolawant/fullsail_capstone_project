import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowRight, FaChevronRight } from "react-icons/fa";
import { addRecentActivity } from "../utils/activityStorage";

import {
  deleteDemoProject,
  getDemoProjects,
  initializeDemoData,
  updateDemoProject,
} from "../utils/demodata";

function Projects() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workspaceName, setWorkspaceName] = useState("");

  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingProject, setDeletingProject] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const workspaceParam = searchParams.get("workspace");

  const selectedWorkspaceId = workspaceParam
    ? Number(workspaceParam)
    : null;

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      // Demo mode
      if (!token) {
        initializeDemoData();
        setProjects(getDemoProjects());
        setLoading(false);
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/projects/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load projects.");
      }

      const data = await response.json();
      setProjects(data);
    } catch {
      setError(
        "Unable to load projects. Make sure you are logged in and the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const loadWorkspaceName = async () => {
      if (!selectedWorkspaceId) {
        setWorkspaceName("");
        return;
      }

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setWorkspaceName(`Workspace #${selectedWorkspaceId}`);
          return;
        }

        const response = await fetch(
          `http://127.0.0.1:8000/workspaces/${selectedWorkspaceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          setWorkspaceName(`Workspace #${selectedWorkspaceId}`);
          return;
        }

        const workspace = await response.json();

        setWorkspaceName(
          workspace.name || `Workspace #${selectedWorkspaceId}`
        );
      } catch {
        setWorkspaceName(`Workspace #${selectedWorkspaceId}`);
      }
    };

    loadWorkspaceName();
  }, [selectedWorkspaceId]);

  const filteredProjects = useMemo(() => {
    if (!selectedWorkspaceId) {
      return projects;
    }

    return projects.filter(
      (project) =>
        Number(project.workspace_id) === selectedWorkspaceId
    );
  }, [projects, selectedWorkspaceId]);

  const displayWorkspaceName =
    workspaceName ||
    (selectedWorkspaceId
      ? `Workspace #${selectedWorkspaceId}`
      : "");

  const clearWorkspaceFilter = () => {
    setSearchParams({});
    setWorkspaceName("");
  };

  const openProject = (project) => {
    navigate("/product-architect", {
      state: {
        project,
      },
    });
  };

  const startEditing = (project) => {
    setEditingProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description || "");
    setEditError("");
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setEditTitle("");
    setEditDescription("");
    setEditError("");
  };

  const saveProjectChanges = async (event) => {
    event.preventDefault();
    setEditError("");

    const cleanedTitle = editTitle.trim();
    const cleanedDescription = editDescription.trim();

    if (!cleanedTitle) {
      setEditError("Project name is required.");
      return;
    }

    if (cleanedTitle.length > 100) {
      setEditError("Project name must be 100 characters or fewer.");
      return;
    }

    if (cleanedDescription.length > 500) {
      setEditError(
        "Project description must be 500 characters or fewer."
      );
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      let updatedProject;

      if (!token) {
        updatedProject = updateDemoProject(editingProject.id, {
          title: cleanedTitle,
          description: cleanedDescription,
        });
      } else {
        const response = await fetch(
          `http://127.0.0.1:8000/projects/${editingProject.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: cleanedTitle,
              description: cleanedDescription,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);

          throw new Error(
            errorData?.detail || "Unable to update project."
          );
        }

        updatedProject = await response.json();
      }

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === updatedProject.id
            ? updatedProject
            : project
        )
      );

      addRecentActivity({
        type: "Project Updated",
        title: `${updatedProject.title} updated`,
        description: "Project name or description was updated.",
        projectName: updatedProject.title,
      });

      cancelEditing();
    } catch (error) {
      setEditError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const startDeleting = (project) => {
    setDeletingProject(project);
    setDeleteError("");
  };

  const cancelDeleting = () => {
    setDeletingProject(null);
    setDeleteError("");
  };

  const confirmDeleteProject = async () => {
    setDeleting(true);
    setDeleteError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        deleteDemoProject(deletingProject.id);
      } else {
        const response = await fetch(
          `http://127.0.0.1:8000/projects/${deletingProject.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);

          throw new Error(
            errorData?.detail || "Unable to delete project."
          );
        }
      }

      setProjects((currentProjects) =>
        currentProjects.filter(
          (project) => project.id !== deletingProject.id
        )
      );

      addRecentActivity({
        type: "Project Deleted",
        title: `${deletingProject.title} deleted`,
        description: "The project was permanently removed.",
        projectName: deletingProject.title,
      });

      cancelDeleting();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main
      className="flex-1 p-10"
      data-testid="project-list-view"
    >
      {/* Workspace Breadcrumb */}
      {selectedWorkspaceId && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate("/workspaces")}
            className="font-medium text-slate-400 transition hover:text-cyan-400"
          >
            Workspaces
          </button>

          <FaChevronRight className="text-xs text-slate-600" />

          <span className="font-medium text-cyan-400">
            {displayWorkspaceName}
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold text-white">
              Projects
            </h1>

            {selectedWorkspaceId && (
              <span className="rounded-full border border-cyan-700/50 bg-cyan-950/40 px-3 py-1 text-sm font-medium text-cyan-400">
                {filteredProjects.length}{" "}
                {filteredProjects.length === 1
                  ? "Project"
                  : "Projects"}
              </span>
            )}
          </div>

          <p className="mt-2 text-slate-400">
            {selectedWorkspaceId
              ? `Viewing projects from ${displayWorkspaceName}.`
              : "View and manage projects from your workspaces."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {selectedWorkspaceId && (
            <button
              type="button"
              onClick={clearWorkspaceFilter}
              className="rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-700"
            >
              Show All Projects
            </button>
          )}

          <button
            type="button"
            onClick={loadProjects}
            className="rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center"
          data-testid="projects-loading"
        >
          <p className="text-slate-400">
            Loading projects...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Empty State - All Projects */}
      {!loading &&
        !error &&
        !selectedWorkspaceId &&
        projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
            <h3 className="text-xl font-semibold text-white">
              No projects found
            </h3>

            <p className="mt-2 text-slate-400">
              Projects will appear here after they are created.
            </p>
          </div>
        )}

      {/* Empty State - Selected Workspace */}
      {!loading &&
        !error &&
        selectedWorkspaceId &&
        filteredProjects.length === 0 && (
          <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-8">
            <div className="max-w-lg text-center">
              <h3 className="text-2xl font-bold text-white">
                No projects in this workspace
              </h3>

              <p className="mt-2 text-slate-400">
                {displayWorkspaceName} does not have any projects yet.
              </p>

              <button
                type="button"
                onClick={clearWorkspaceFilter}
                className="mt-6 rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Show All Projects
              </button>
            </div>
          </div>
        )}

      {/* Project Cards */}
      {!loading &&
        !error &&
        filteredProjects.length > 0 && (
          <div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
            data-testid="project-list"
          >
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className="flex min-h-56 flex-col rounded-xl border border-slate-800 bg-slate-900 p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-cyan-700/50 hover:shadow-xl"
                data-testid={`project-${project.id}`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">
                    {project.title}
                  </h3>

                  <p className="mt-3 min-h-12 text-slate-400">
                    {project.description ||
                      "No project description provided."}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-800 pt-4">
                  {/* Workspace label only shown when viewing ALL projects */}
                  {!selectedWorkspaceId && (
                    <div className="mb-4">
                      <span className="text-sm text-slate-500">
                        Workspace {project.workspace_id}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => openProject(project)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Open Project
                      <FaArrowRight className="text-xs" />
                    </button>

                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => startEditing(project)}
                        className="text-sm font-medium text-slate-300 transition hover:text-white"
                        data-testid={`edit-project-${project.id}`}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => startDeleting(project)}
                        className="text-sm font-medium text-red-400 transition hover:text-red-300"
                        data-testid={`delete-project-${project.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          data-testid="edit-project-panel"
        >
          <form
            onSubmit={saveProjectChanges}
            className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6"
          >
            <h3 className="text-2xl font-bold">
              Edit Project
            </h3>

            <div className="mt-6">
              <label
                htmlFor="edit-project-title"
                className="mb-2 block text-sm text-slate-300"
              >
                Project Name
              </label>

              <input
                id="edit-project-title"
                value={editTitle}
                onChange={(event) =>
                  setEditTitle(event.target.value)
                }
                maxLength={100}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-cyan-500 focus:outline-none"
                data-testid="edit-project-title"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="edit-project-description"
                className="mb-2 block text-sm text-slate-300"
              >
                Project Description
              </label>

              <textarea
                id="edit-project-description"
                value={editDescription}
                onChange={(event) =>
                  setEditDescription(event.target.value)
                }
                rows="5"
                maxLength={500}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-cyan-500 focus:outline-none"
                data-testid="edit-project-description"
              />
            </div>

            {editError && (
              <p
                className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-red-300"
                role="alert"
              >
                {editError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded-lg bg-slate-800 px-5 py-2 transition hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-cyan-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                data-testid="save-project-changes"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Project Modal */}
      {deletingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          data-testid="delete-project-panel"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-2xl font-bold">
              Delete Project
            </h3>

            <p className="mt-4 text-slate-300">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-white">
                {deletingProject.title}
              </span>
              ?
            </p>

            <p className="mt-3 text-sm text-red-400">
              This action cannot be undone. All associated project
              content will also be deleted.
            </p>

            {deleteError && (
              <p
                className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-red-300"
                role="alert"
              >
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDeleting}
                disabled={deleting}
                className="rounded-lg bg-slate-800 px-5 py-2 transition hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteProject}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                data-testid="confirm-delete-project"
              >
                {deleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Projects;