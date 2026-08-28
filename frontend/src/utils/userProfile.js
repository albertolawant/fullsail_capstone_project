const SETTINGS_KEY = "tanioSettings";

export function getStoredUserProfile() {
  let settings = null;
  let storedUser = null;

  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);

    if (storedSettings) {
      settings = JSON.parse(storedSettings);
    }
  } catch {
    settings = null;
  }

  try {
    const userData = localStorage.getItem("tanioUser");

    if (userData) {
      storedUser = JSON.parse(userData);
    }
  } catch {
    storedUser = null;
  }

  const displayName =
    settings?.account?.displayName?.trim() ||
    storedUser?.displayName?.trim?.() ||
    storedUser?.username?.trim?.() ||
    storedUser?.name?.trim?.() ||
    storedUser?.full_name?.trim?.() ||
    storedUser?.email?.split("@")[0] ||
    "Tanio User";

  const email =
    storedUser?.email ||
    settings?.account?.email ||
    "";

  return {
    displayName,
    email,
  };
}

export function getUserInitials(name) {
  if (!name) {
    return "TU";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}