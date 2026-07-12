import { addRecentActivity } from "./activityStorage";

const DEMO_PROJECT_KEY = "tanioDemoProjects";
const DEMO_INITIALIZED_KEY = "tanioDemoInitialized";

export function getDemoProjects() {
  const savedProjects = localStorage.getItem(DEMO_PROJECT_KEY);

  if (!savedProjects) {
    return [];
  }

  try {
    return JSON.parse(savedProjects);
  } catch {
    return [];
  }
}

export function updateDemoProject(projectId, updates) {
  const projects = getDemoProjects();

  const updatedProjects = projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          ...updates,
        }
      : project
  );

  localStorage.setItem(
    DEMO_PROJECT_KEY,
    JSON.stringify(updatedProjects)
  );

  return updatedProjects.find(
    (project) => project.id === projectId
  );
}

export function deleteDemoProject(projectId) {
  const projects = getDemoProjects();

  const updatedProjects = projects.filter(
    (project) => project.id !== projectId
  );

  localStorage.setItem(
    DEMO_PROJECT_KEY,
    JSON.stringify(updatedProjects)
  );

  return updatedProjects;
}

export function initializeDemoData() {
  const alreadyInitialized =
    localStorage.getItem(DEMO_INITIALIZED_KEY) === "true";

  if (alreadyInitialized) {
    return;
  }

  const demoProject = {
    id: 1,
    title: "Tanio AI Demo Project",
    description:
      "A sample project used to demonstrate project management and recent activity features.",
    workspace_id: 1,
  };

  localStorage.setItem(
    DEMO_PROJECT_KEY,
    JSON.stringify([demoProject])
  );

  addRecentActivity({
    type: "Project Created",
    title: "Tanio AI Demo Project created",
    description: "A new demo project was added to the workspace.",
    projectName: demoProject.title,
  });

  addRecentActivity({
    type: "Content Generated",
    title: "Product requirements document generated",
    description: "Created a sample PRD for the demo project.",
    projectName: demoProject.title,
  });

  addRecentActivity({
    type: "Work Saved",
    title: "Demo project saved",
    description: "The latest project changes were saved.",
    projectName: demoProject.title,
  });

  localStorage.setItem(DEMO_INITIALIZED_KEY, "true");
}