import { useEffect, useState } from "react";
import {
  FaUsers,
  FaSyncAlt,
  FaClock,
  FaProjectDiagram,
  FaUserPlus,
  FaUserMinus,
  FaUserEdit,
  FaEdit,
  FaExchangeAlt,
  FaFileAlt,
  FaPlusCircle,
  FaTrashAlt,
} from "react-icons/fa";

const API_BASE_URL = "http://127.0.0.1:8000";

function formatActivityDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeActivityDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const differenceSeconds = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );

  if (differenceSeconds < 60) {
    return "Just now";
  }

  const differenceMinutes = Math.floor(differenceSeconds / 60);

  if (differenceMinutes < 60) {
    return `${differenceMinutes} ${
      differenceMinutes === 1 ? "minute" : "minutes"
    } ago`;
  }

  const differenceHours = Math.floor(differenceMinutes / 60);

  if (differenceHours < 24) {
    return `${differenceHours} ${
      differenceHours === 1 ? "hour" : "hours"
    } ago`;
  }

  const differenceDays = Math.floor(differenceHours / 24);

  if (differenceDays < 7) {
    return `${differenceDays} ${
      differenceDays === 1 ? "day" : "days"
    } ago`;
  }

  return formatActivityDate(dateValue);
}

function getActivityStyle(action) {
  switch (action) {
    case "member_added":
      return {
        icon: FaUserPlus,
        wrapper:
          "border-emerald-900/60 bg-emerald-950/30 text-emerald-400",
      };

    case "member_removed":
      return {
        icon: FaUserMinus,
        wrapper: "border-red-900/60 bg-red-950/30 text-red-400",
      };

    case "member_role_changed":
      return {
        icon: FaUserEdit,
        wrapper:
          "border-purple-900/60 bg-purple-950/30 text-purple-400",
      };

    case "project_updated":
      return {
        icon: FaEdit,
        wrapper: "border-cyan-900/60 bg-cyan-950/30 text-cyan-400",
      };

    case "project_moved":
      return {
        icon: FaExchangeAlt,
        wrapper: "border-blue-900/60 bg-blue-950/30 text-blue-400",
      };

    case "content_created":
    case "project_created":
      return {
        icon: FaPlusCircle,
        wrapper:
          "border-emerald-900/60 bg-emerald-950/30 text-emerald-400",
      };

    case "content_updated":
      return {
        icon: FaFileAlt,
        wrapper:
          "border-amber-900/60 bg-amber-950/30 text-amber-400",
      };

    case "content_moved":
      return {
        icon: FaExchangeAlt,
        wrapper:
          "border-indigo-900/60 bg-indigo-950/30 text-indigo-400",
      };

    case "content_deleted":
      return {
        icon: FaTrashAlt,
        wrapper: "border-red-900/60 bg-red-950/30 text-red-400",
      };

    default:
      return {
        icon: FaProjectDiagram,
        wrapper: "border-slate-800 bg-slate-950 text-slate-400",
      };
  }
}

function OnlineStatus({ online }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${
          online
            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            : "bg-slate-600"
        }`}
      />
      <span
        className={`text-xs font-semibold ${
          online ? "text-emerald-300" : "text-slate-400"
        }`}
      >
        {online ? "Online" : "Offline"}
      </span>
    </div>
  );
}

function MemberCard({ username, email, role, online }) {
  const isOwner = role === "owner";

  return (
    <article
      className={`min-w-0 rounded-2xl border p-5 sm:p-6 ${
        isOwner
          ? "border-cyan-900/60 bg-cyan-950/20"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div
            aria-hidden="true"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-lg font-bold ${
              isOwner
                ? "border-cyan-800/60 bg-cyan-950/60 text-cyan-300"
                : "border-slate-700 bg-slate-950 text-slate-300"
            }`}
          >
            {String(username || "T").charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 break-words font-bold text-white">
                {username || "Tanio User"}
              </p>

              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  isOwner
                    ? "border-cyan-800 bg-cyan-950/60 text-cyan-300"
                    : role === "editor"
                      ? "border-purple-800 bg-purple-950/40 text-purple-300"
                      : "border-slate-700 bg-slate-950 text-slate-400"
                }`}
              >
                {role}
              </span>
            </div>

            <p className="mt-1 break-all text-sm text-slate-400">
              {email}
            </p>
          </div>
        </div>

        <OnlineStatus online={online} />
      </div>
    </article>
  );
}

function Community() {
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projectMembers, setProjectMembers] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadProjects = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/projects/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Unable to load your projects."
        );
      }

      const data = await response.json();
      const availableProjects = Array.isArray(data) ? data : [];

      setProjects(availableProjects);

      if (availableProjects.length > 0) {
        setProjectId(String(availableProjects[0].id));
      }
    } catch (requestError) {
      console.error("Community project load failed:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your projects."
      );
    }
  };

  const loadProjectMembers = async () => {
    const token = localStorage.getItem("token");

    if (!token || !projectId) {
      setProjectMembers(null);
      return;
    }

    setMembersLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load project collaboration details."
        );
      }

      const data = await response.json();
      setProjectMembers(data);
    } catch (requestError) {
      console.error(
        "Community member summary load failed:",
        requestError
      );
      setProjectMembers(null);
    } finally {
      setMembersLoading(false);
    }
  };

  const loadActivity = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    if (!projectId) {
      setActivities([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/projects/${projectId}/activity`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Unable to load project activity."
        );
      }

      const data = await response.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("Community activity load failed:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load project activity."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (!projectId) {
      setActivities([]);
      setProjectMembers(null);
      return;
    }

    loadActivity();
    loadProjectMembers();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const refreshCommunity = () => {
      loadActivity();
      loadProjectMembers();
    };

    const communityInterval = window.setInterval(
      refreshCommunity,
      30000
    );

    return () => {
      window.clearInterval(communityInterval);
    };
  }, [projectId]);

  const members = projectMembers?.members || [];
  const totalPeople = projectMembers ? members.length + 1 : 0;
  const onlinePeople = projectMembers
    ? (projectMembers.owner_is_online ? 1 : 0) +
      members.filter((member) => member.is_online).length
    : 0;

  return (
    <main className="min-h-screen w-full min-w-0 flex-1 px-4 py-5 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="w-full min-w-0 space-y-6 sm:space-y-8">
        <section
          aria-labelledby="community-title"
          className="w-full rounded-2xl border border-cyan-900/60 bg-[#071222] p-5 shadow-lg sm:p-7 lg:p-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-900/60 bg-cyan-950/40 text-2xl text-cyan-400">
                  <FaUsers aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
                    Collaboration
                  </p>
                  <h1
                    id="community-title"
                    className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl"
                  >
                    Community
                  </h1>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-400 sm:text-base">
                Follow project collaboration, member changes, and
                recent activity across Tanio.
              </p>
            </div>

            <div className="w-full min-w-0 lg:w-80 lg:shrink-0 xl:w-96">
              <label
                htmlFor="community-project"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Project
              </label>

              <select
                id="community-project"
                value={projectId}
                onChange={(event) => {
                  setProjectMembers(null);
                  setActivities([]);
                  setProjectId(event.target.value);
                }}
                disabled={projects.length === 0}
                className="mt-2 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {projects.length === 0 ? (
                  <option value="">No projects available</option>
                ) : (
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                      {project.current_user_role
                        ? ` (${project.current_user_role})`
                        : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </section>

        <section aria-labelledby="community-overview-title">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Collaboration Overview
            </p>
            <h2
              id="community-overview-title"
              className="mt-1 text-xl font-bold sm:text-2xl"
            >
              Project Community
            </h2>
          </div>

          {membersLoading && !projectMembers ? (
            <div
              role="status"
              className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center"
            >
              <FaSyncAlt
                aria-hidden="true"
                className="mx-auto animate-spin text-2xl text-cyan-400 motion-reduce:animate-none"
              />
              <p className="mt-3 text-sm font-semibold text-slate-300">
                Loading project community...
              </p>
            </div>
          ) : projectMembers ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0 rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-400">
                  Your Role
                </p>
                <p className="mt-3 break-words text-2xl font-bold capitalize">
                  {projectMembers.current_user_role}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Your access to this project
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Project Owner
                </p>
                <p className="mt-3 break-words text-2xl font-bold">
                  {projectMembers.owner_username}
                </p>
                <div className="mt-2">
                  <OnlineStatus
                    online={projectMembers.owner_is_online}
                  />
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Members
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {members.length}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Shared collaborators
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                  Online Now
                </p>
                <p className="mt-3 text-3xl font-bold">
                  {onlinePeople}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Active collaborators
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
              {projectId
                ? "Collaboration information is unavailable for this project."
                : "Choose a project to view its community."}
            </div>
          )}
        </section>

        <section aria-labelledby="community-members-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Collaborators
              </p>
              <h2
                id="community-members-title"
                className="mt-1 text-xl font-bold sm:text-2xl"
              >
                Project Members
              </h2>
            </div>

            {projectMembers && (
              <span className="shrink-0 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                {totalPeople} {totalPeople === 1 ? "person" : "people"}
              </span>
            )}
          </div>

          {projectMembers && (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              }}
            >
              <MemberCard
                username={projectMembers.owner_username}
                email={projectMembers.owner_email}
                role="owner"
                online={projectMembers.owner_is_online}
              />

              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  username={member.username}
                  email={member.email}
                  role={member.role}
                  online={member.is_online}
                />
              ))}
            </div>
          )}
        </section>

        <section
          aria-labelledby="community-activity-title"
          className="pb-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Project Feed
              </p>
              <h2
                id="community-activity-title"
                className="mt-1 text-xl font-bold sm:text-2xl"
              >
                Recent Activity
              </h2>
            </div>

            <span className="shrink-0 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
              {activities.length}{" "}
              {activities.length === 1 ? "event" : "events"}
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-300"
            >
              {error}
            </div>
          )}

          {!error && loading && (
            <div
              role="status"
              className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center"
            >
              <FaSyncAlt
                aria-hidden="true"
                className="mx-auto animate-spin text-3xl text-cyan-400 motion-reduce:animate-none"
              />
              <p className="mt-4 font-semibold">
                Loading collaboration activity...
              </p>
            </div>
          )}

          {!error && !loading && activities.length === 0 && (
            <div className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-10 text-center sm:min-h-[260px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950">
                <FaClock
                  aria-hidden="true"
                  className="text-2xl text-slate-400"
                />
              </div>

              <h3 className="mt-4 text-xl font-bold">
                {projectId ? "No activity yet" : "Select a project"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {projectId
                  ? "Collaboration events for this project will appear here."
                  : "Choose a project above to see its collaboration activity."}
              </p>
            </div>
          )}

          {!error && !loading && activities.length > 0 && (
            <div className="space-y-3">
              {activities.map((activity) => {
                const activityStyle = getActivityStyle(activity.action);
                const ActivityIcon = activityStyle.icon;

                return (
                  <article
                    key={activity.id}
                    className="w-full min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm sm:p-6"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${activityStyle.wrapper}`}
                      >
                        <ActivityIcon aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <p className="break-words font-bold">
                              {activity.username || "Tanio User"}
                            </p>

                            <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              {activity.action.replaceAll("_", " ")}
                            </span>
                          </div>

                          <p
                            className="shrink-0 text-xs text-slate-400"
                            title={formatActivityDate(activity.created_at)}
                          >
                            {formatRelativeActivityDate(
                              activity.created_at
                            )}
                          </p>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                          {activity.details ||
                            "Project activity recorded."}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Community;