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

  const now = new Date();
  const differenceMs = now.getTime() - date.getTime();
  const differenceSeconds = Math.floor(differenceMs / 1000);

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
        wrapper:
          "border-red-900/60 bg-red-950/30 text-red-400",
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
        wrapper:
          "border-cyan-900/60 bg-cyan-950/30 text-cyan-400",
      };

    case "project_moved":
      return {
        icon: FaExchangeAlt,
        wrapper:
          "border-blue-900/60 bg-blue-950/30 text-blue-400",
      };

    case "content_created":
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
        wrapper:
          "border-red-900/60 bg-red-950/30 text-red-400",
      };

    case "project_created":
    return {
        icon: FaPlusCircle,
        wrapper:
        "border-emerald-900/60 bg-emerald-950/30 text-emerald-400",
    };

    default:
      return {
        icon: FaProjectDiagram,
        wrapper:
          "border-slate-800 bg-slate-950 text-slate-400",
      };
  }
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
        const response = await fetch(
        `${API_BASE_URL}/projects/`,
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
            errorData?.detail || "Unable to load your projects."
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
        throw new Error("Unable to load project collaboration details.");
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
          errorData?.detail || "Unable to load project activity."
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

    const communityInterval = setInterval(
        refreshCommunity,
        30 * 1000
    );

    return () => {
        clearInterval(communityInterval);
    };
  }, [projectId]);

  return (
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-5 lg:px-6 xl:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <section className="rounded-[30px] border border-cyan-900/60 bg-[#071222] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-900/60 bg-cyan-950/40 text-xl text-cyan-400">
                <FaUsers />
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
                Collaboration
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Community
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
                Follow project collaboration, member changes, and recent activity across Tanio.
              </p>
            </div>

            <div>
                <label
                    htmlFor="community-project"
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                    Project
                </label>

                <select
                    id="community-project"
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    disabled={projects.length === 0}
                    className="mt-2 min-w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {projects.length === 0 ? (
                    <option value="">No projects available</option>
                    ) : (
                    projects.map((project) => (
                        <option
                        key={project.id}
                        value={project.id}
                        >
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

        <section className="mt-8">
            <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Collaboration Overview
                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                Project Community
                </h2>
            </div>

            {membersLoading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
                <FaSyncAlt className="mx-auto animate-spin text-2xl text-cyan-400" />

                <p className="mt-3 text-sm font-semibold text-slate-300">
                    Loading project community...
                </p>
                </div>
            ) : projectMembers ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-400">
                    Your Role
                    </p>

                    <p className="mt-2 text-xl font-black capitalize text-white">
                    {projectMembers.current_user_role}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Project Owner
                    </p>

                    <p className="mt-2 text-xl font-black text-white">
                    {projectMembers.owner_username}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-xs">
                    <span
                        className={`h-2.5 w-2.5 rounded-full ${
                        projectMembers.owner_is_online
                            ? "bg-emerald-400"
                            : "bg-slate-600"
                        }`}
                    />

                    <span
                        className={
                        projectMembers.owner_is_online
                            ? "font-semibold text-emerald-300"
                            : "text-slate-500"
                        }
                    >
                        {projectMembers.owner_is_online
                        ? "Online"
                        : "Offline"}
                    </span>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Members
                    </p>

                    <p className="mt-2 text-xl font-black text-white">
                    {projectMembers.members.length}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                    shared collaborators
                    </p>
                </div>

                <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                        Online Now
                    </p>

                    <p className="mt-2 text-xl font-black text-white">
                    {(projectMembers.owner_is_online ? 1 : 0) +
                        projectMembers.members.filter(
                        (member) => member.is_online
                        ).length}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                    active collaborators
                    </p>
                </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
                    Collaboration information is unavailable for this project.
                </div>
            )}
        </section>        

        <section className="mt-8">
            <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Collaborators
                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                    Project Members
                </h2>
                </div>

                {projectMembers && (
                <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                    {projectMembers.members.length + 1} people
                </span>
                )}
            </div>

            {projectMembers && (
                <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-cyan-900/60 bg-cyan-950/20 p-5">
                    <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-white">
                            {projectMembers.owner_username}
                        </p>

                        <span className="rounded-full border border-cyan-800 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                            Owner
                        </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-slate-500">
                        {projectMembers.owner_email}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <span
                        className={`h-2.5 w-2.5 rounded-full ${
                            projectMembers.owner_is_online
                            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                            : "bg-slate-600"
                        }`}
                        />

                        <span
                        className={`text-xs font-semibold ${
                            projectMembers.owner_is_online
                            ? "text-emerald-300"
                            : "text-slate-500"
                        }`}
                        >
                        {projectMembers.owner_is_online ? "Online" : "Offline"}
                        </span>
                    </div>
                    </div>
                </article>

                {projectMembers.members.map((member) => (
                    <article
                    key={member.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                    >
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="truncate font-bold text-white">
                            {member.username}
                            </p>

                            <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                member.role === "editor"
                                ? "border-purple-800 bg-purple-950/40 text-purple-300"
                                : "border-slate-700 bg-slate-950 text-slate-400"
                            }`}
                            >
                            {member.role}
                            </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-slate-500">
                            {member.email}
                        </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                        <span
                            className={`h-2.5 w-2.5 rounded-full ${
                            member.is_online
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                : "bg-slate-600"
                            }`}
                        />

                        <span
                            className={`text-xs font-semibold ${
                            member.is_online
                                ? "text-emerald-300"
                                : "text-slate-500"
                            }`}
                        >
                            {member.is_online ? "Online" : "Offline"}
                        </span>
                        </div>
                    </div>
                    </article>
                ))}
                </div>
            )}
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Project Feed
              </p>

              <h2 className="mt-1 text-2xl font-bold text-white">
                Recent Activity
              </h2>
            </div>

            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
              {activities.length}{" "}
              {activities.length === 1 ? "event" : "events"}
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-300">
              {error}
            </div>
          )}

          {!error && loading && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
              <FaSyncAlt className="mx-auto animate-spin text-3xl text-cyan-400" />

              <p className="mt-4 font-semibold text-white">
                Loading collaboration activity...
              </p>
            </div>
          )}

          {!error && !loading && activities.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
              <FaClock className="mx-auto text-3xl text-slate-600" />

              <h3 className="mt-4 text-xl font-bold text-white">
                No activity yet
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Collaboration events for this project will appear here.
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
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
                    >
                    <div className="flex items-start gap-4">
                        <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${activityStyle.wrapper}`}
                        >
                        <ActivityIcon />
                        </div>

                        <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-white">
                            {activity.username || "Tanio User"}
                            </p>

                            <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {activity.action.replaceAll("_", " ")}
                            </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            {activity.details || "Project activity recorded."}
                        </p>

                        <p
                            className="mt-3 text-xs text-slate-500"
                            title={formatActivityDate(activity.created_at)}
                        >
                            {formatRelativeActivityDate(activity.created_at)}
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