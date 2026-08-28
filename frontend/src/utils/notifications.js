const NOTIFICATIONS_KEY = "tanioNotifications";
export const NOTIFICATIONS_EVENT =
  "tanio-notifications-updated";

function getNotifications() {
  try {
    const stored = localStorage.getItem(
      NOTIFICATIONS_KEY
    );

    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error(
      "Failed to read Tanio notifications:",
      error
    );

    return [];
  }
}

function saveNotifications(notifications) {
  localStorage.setItem(
    NOTIFICATIONS_KEY,
    JSON.stringify(notifications)
  );

  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_EVENT)
  );
}

export function addNotification({
  title,
  message,
  type = "system",
  actionPath = null,
}) {
  if (!title || !message) {
    return;
  }

  const notifications = getNotifications();

  const notification = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    title,
    message,
    type,
    actionPath,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const updatedNotifications = [
    notification,
    ...notifications,
  ].slice(0, 50);

  saveNotifications(updatedNotifications);

  return notification;
}

export function notifyProjectCreated(projectName) {
  return addNotification({
    title: "Project created",
    message: `${projectName} is ready to work on.`,
    type: "project",
    actionPath: "/projects",
  });
}

export function notifyWorkspaceCreated(workspaceName) {
  return addNotification({
    title: "Workspace created",
    message: `${workspaceName} was added to your workspaces.`,
    type: "workspace",
    actionPath: "/workspaces",
  });
}

export function notifyGenerationComplete(
  toolName,
  projectName
) {
  return addNotification({
    title: `${toolName} generation complete`,
    message: projectName
      ? `Your AI content for ${projectName} is ready.`
      : "Your AI-generated content is ready.",
    type: "ai",
    actionPath:
      toolName === "Tabletop Creator"
        ? "/tabletop-creator"
        : "/product-architect",
  });
}

export function notifyLogoGenerated(projectName) {
  return addNotification({
    title: "Logo generated",
    message: projectName
      ? `A new logo for ${projectName} is ready.`
      : "Your new logo is ready.",
    type: "ai",
    actionPath: "/product-architect",
  });
}

export function notifyPitchDeckGenerated(projectName) {
  return addNotification({
    title: "Pitch deck generated",
    message: projectName
      ? `The pitch deck for ${projectName} is ready.`
      : "Your AI pitch deck is ready.",
    type: "ai",
    actionPath: "/product-architect",
  });
}

export function notifyContentSaved(contentName) {
  return addNotification({
    title: "Content saved",
    message: contentName
      ? `${contentName} was saved to your Content Library.`
      : "Your content was saved to the Content Library.",
    type: "content",
    actionPath: "/content",
  });
}

export function clearAllNotifications() {
  saveNotifications([]);
}

export function markNotificationRead(id) {
  const notifications = getNotifications();

  const updatedNotifications = notifications.map(
    (notification) =>
      notification.id === id
        ? {
            ...notification,
            read: true,
          }
        : notification
  );

  saveNotifications(updatedNotifications);
}

export function markAllNotificationsRead() {
  const notifications = getNotifications();

  const updatedNotifications = notifications.map(
    (notification) => ({
      ...notification,
      read: true,
    })
  );

  saveNotifications(updatedNotifications);
}

export function getStoredNotifications() {
  return getNotifications();
}