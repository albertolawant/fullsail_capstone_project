import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function RecentContent({
  refreshKey = 0,
  onRefresh,
  refreshing = false,
}) {
  const [activities, setActivities] = useState([]);

  const loadActivities = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setActivities([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/activity/?limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tanioSession");
        localStorage.removeItem("tanioUser");

        setActivities([]);
        return;
      }

      if (!response.ok) {
        setActivities([]);
        return;
      }

      const data = await response.json();

      const activityLog = Array.isArray(data) ? data : [];

      setActivities(
        activityLog.map((activity) => ({
          id: activity.id,
          type: activity.action_type,
          title: activity.title,
          description: activity.description || "",
          projectName:
            activity.project_name ||
            activity.new_project_name ||
            activity.old_project_name ||
            "General",
          createdAt: activity.created_at,
        }))
      );
    } catch (error) {
      console.error("Recent activity load failed:", error);
      setActivities([]);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [refreshKey]);

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }

    await loadActivities();
  };

  const getActivityAppearance = (activity) => {
    const type = String(activity?.type || "").toLowerCase();

    if (type.includes("delete")) {
      return {
        icon: "×",
        iconClasses:
          "border-red-900 bg-red-950/60 text-red-300",
        badgeClasses:
          "border-red-900/80 bg-red-950/40 text-red-300",
      };
    }

    if (
      type.includes("regenerat") ||
      type.includes("generated") ||
      type.includes("content")
    ) {
      return {
        icon: "✦",
        iconClasses:
          "border-cyan-900 bg-cyan-950/60 text-cyan-300",
        badgeClasses:
          "border-cyan-900/80 bg-cyan-950/40 text-cyan-300",
      };
    }

    if (type.includes("project")) {
      return {
        icon: "◆",
        iconClasses:
          "border-purple-900 bg-purple-950/60 text-purple-300",
        badgeClasses:
          "border-purple-900/80 bg-purple-950/40 text-purple-300",
      };
    }

    return {
      icon: "•",
      iconClasses:
        "border-slate-700 bg-slate-950 text-slate-300",
      badgeClasses:
        "border-slate-700 bg-slate-950 text-slate-300",
    };
  };

  const formatRelativeDate = (date) => {
    if (!date) {
      return "Unknown";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown";
    }

    const differenceMs = Date.now() - parsedDate.getTime();
    const differenceSeconds = Math.floor(differenceMs / 1000);
    const differenceMinutes = Math.floor(differenceSeconds / 60);
    const differenceHours = Math.floor(differenceMinutes / 60);
    const differenceDays = Math.floor(differenceHours / 24);

    if (differenceSeconds < 60) {
      return "Just now";
    }

    if (differenceMinutes < 60) {
      return `${differenceMinutes}m ago`;
    }

    if (differenceHours < 24) {
      return `${differenceHours}h ago`;
    }

    if (differenceDays < 7) {
      return `${differenceDays}d ago`;
    }

    return parsedDate.toLocaleDateString();
  };

  const formatFullDate = (date) => {
    if (!date) {
      return "Unknown";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown";
    }

    return parsedDate.toLocaleString();
  };

  return (
    <section
      className="mt-10"
      data-testid="recent-activity-section"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Activity
          </p>

          <h3 className="mt-1 text-xl font-bold text-white">
            Recent Activity
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Your latest project and AI activity across Tanio.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          data-testid="refresh-activity"
        >
          <span
            className={refreshing ? "animate-spin" : ""}
            aria-hidden="true"
          >
            ↻
          </span>

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/10">
        {activities.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center px-6 py-14 text-center"
            data-testid="empty-activity"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-2xl text-slate-400">
              ✦
            </div>

            <p className="mt-4 font-semibold text-white">
              No recent activity yet
            </p>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Project changes, AI generations, and other activity will appear
              here as you use Tanio.
            </p>
          </div>
        ) : (
          <div data-testid="activity-list">
            {activities.map((activity, index) => {
              const appearance =
                getActivityAppearance(activity);

              return (
                <div
                  key={activity.id}
                  className="group relative flex gap-4 border-b border-slate-800 px-5 py-5 transition last:border-b-0 hover:bg-slate-800/35 md:px-6"
                  data-testid={`activity-${activity.id}`}
                >
                  <div className="relative flex shrink-0 flex-col items-center">
                    <div
                      className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-xl border font-bold ${appearance.iconClasses}`}
                    >
                      {appearance.icon}
                    </div>

                    {index < activities.length - 1 && (
                      <div className="absolute top-11 h-[calc(100%+1.25rem)] w-px bg-slate-800" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-white">
                            {activity.title}
                          </h4>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${appearance.badgeClasses}`}
                          >
                            {activity.type}
                          </span>
                        </div>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                          {activity.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="text-slate-600"
                              aria-hidden="true"
                            >
                              ◇
                            </span>

                            {activity.projectName || "General"}
                          </span>

                          <span className="text-slate-700">•</span>

                          <span
                            title={formatFullDate(activity.createdAt)}
                          >
                            {formatRelativeDate(activity.createdAt)}
                          </span>
                        </div>
                      </div>

                      <span
                        className="hidden shrink-0 text-xs text-slate-600 md:block md:pt-1"
                        title={formatFullDate(activity.createdAt)}
                      >
                        {formatFullDate(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default RecentContent;