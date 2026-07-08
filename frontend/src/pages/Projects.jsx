import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getDemoProjects,
  initializeDemoData,
} from "../utils/demoData";

function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project)}
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

                <span className="text-sm text-cyan-400">Open Project</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

export default Projects;