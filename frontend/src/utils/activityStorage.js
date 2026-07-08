const ACTIVITY_KEY = "tanioRecentActivity";
const ACTIVITY_EVENT = "tanio-activity-updated";

export function getRecentActivities() {
  const savedActivities = localStorage.getItem(ACTIVITY_KEY);

  if (!savedActivities) {
    return [];
  }

  try {
    return JSON.parse(savedActivities).sort(
      (first, second) =>
        new Date(second.createdAt) - new Date(first.createdAt)
    );
  } catch {
    return [];
  }
}

export function addRecentActivity(activity) {
  const currentActivities = getRecentActivities();

  const newActivity = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...activity,
  };

  const updatedActivities = [newActivity, ...currentActivities].slice(0, 10);

  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updatedActivities));
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
}

export const activityEventName = ACTIVITY_EVENT;