import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addRecentActivity } from "../utils/activityStorage";

import {
  deleteDemoProject,
  getDemoProjects,
  initializeDemoData,
  updateDemoProject,
} from "../utils/demodata";

function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingProject, setDeletingProject] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      // temp
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
    <main className="flex-1 p-10" data-testid="project-list-view">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold">Projects</h2>
          <p className="text-slate-400 mt-2">
            View and manage projects from your workspaces.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProjects}
          className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="text-slate-400" data-testid="projects-loading">
          Loading projects...
        </p>
      )}

      {error && (
        <div
          className="bg-red-950 border border-red-800 text-red-300 rounded-lg p-4"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold">No projects found</h3>
          <p className="text-slate-400 mt-2">
            Projects will appear here after they are created.
          </p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          data-testid="project-list"
        >
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-xl p-6 text-left transition-all duration-200"
              data-testid={`project-${project.id}`}
            >
              <h3 className="text-xl font-semibold text-white">
                {project.title}
              </h3>

              <p className="text-slate-400 mt-3 min-h-12">
                {project.description || "No project description provided."}
              </p>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
                <span className="text-sm text-slate-500">
                  Workspace {project.workspace_id}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startEditing(project)}
                    className="text-sm text-slate-300 hover:text-white"
                    data-testid={`edit-project-${project.id}`}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => startDeleting(project)}
                    className="text-sm text-red-400 hover:text-red-300"
                    data-testid={`delete-project-${project.id}`}
                  >
                    Delete
                  </button>

                  <button
                    type="button"
                    onClick={() => openProject(project)}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Open Project
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editingProject && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50"
          data-testid="edit-project-panel"
        >
          <form
            onSubmit={saveProjectChanges}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl p-6"
          >
            <h3 className="text-2xl font-bold">Edit Project</h3>

            <div className="mt-6">
              <label
                htmlFor="edit-project-title"
                className="block text-sm text-slate-300 mb-2"
              >
                Project Name
              </label>

              <input
                id="edit-project-title"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={100}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                data-testid="edit-project-title"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="edit-project-description"
                className="block text-sm text-slate-300 mb-2"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                data-testid="edit-project-description"
              />
            </div>

            {editError && (
              <p
                className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
                role="alert"
              >
                {editError}
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="bg-slate-800 hover:bg-slate-700 px-5 py-2 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-5 py-2 rounded-lg disabled:opacity-50"
                data-testid="save-project-changes"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {deletingProject && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50"
          data-testid="delete-project-panel"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h3 className="text-2xl font-bold">Delete Project</h3>

            <p className="text-slate-300 mt-4">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-white">
                {deletingProject.title}
              </span>
              ?
            </p>

            <p className="text-sm text-red-400 mt-3">
              This action cannot be undone. All associated project content
              will also be deleted.
            </p>

            {deleteError && (
              <p
                className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
                role="alert"
              >
                {deleteError}
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={cancelDeleting}
                disabled={deleting}
                className="bg-slate-800 hover:bg-slate-700 px-5 py-2 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteProject}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50"
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