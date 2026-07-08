import { useEffect, useState } from "react";
import {
  activityEventName,
  getRecentActivities,
} from "../utils/activityStorage";

function RecentContent() {
  const [activities, setActivities] = useState([]);

  const loadActivities = () => {
    setActivities(getRecentActivities());
  };

  useEffect(() => {
    loadActivities();

    window.addEventListener(activityEventName, loadActivities);

    return () => {
      window.removeEventListener(activityEventName, loadActivities);
    };
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <section className="mt-10" data-testid="recent-activity-section">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold">Recent Activity</h3>

          <p className="text-sm text-slate-400 mt-1">
            Your latest project and content activity.
          </p>
        </div>

        <button
          type="button"
          onClick={loadActivities}
          className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm"
          data-testid="refresh-activity"
        >
          Refresh
        </button>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 text-slate-400 text-sm p-4 border-b border-slate-800">
          <p>Activity</p>
          <p>Type</p>
          <p>Project</p>
          <p>Date</p>
        </div>
        {activities.length === 0 ? (
          <div className="p-8 text-center" data-testid="empty-activity">
            <p className="font-semibold">No recent activity</p>

            <p className="text-slate-400 text-sm mt-2">
              Project and content activity will appear here.
            </p>
          </div>
        ) : (
          <div data-testid="activity-list">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="grid grid-cols-4 items-center p-4 border-b border-slate-800 last:border-b-0"
                data-testid={`activity-${activity.id}`}
              >
                <div>
                  <p className="font-semibold">{activity.title}</p>

                  <p className="text-sm text-slate-400 mt-1">
                    {activity.description}
                  </p>
                </div>

                <p className="text-sm text-cyan-400">
                  {activity.type}
                </p>

                <p className="text-sm text-slate-400">
                  {activity.projectName || "General"}
                </p>

                <p className="text-sm text-slate-500">
                  {formatDate(activity.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default RecentContent;