import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaUserCircle,
  FaCog,
} from "react-icons/fa";

const SETTINGS_KEY = "tanioSettings";

function getDisplayName() {
  try {
    const storedSettings =
      localStorage.getItem(SETTINGS_KEY);

    if (!storedSettings) {
      return "Tanio User";
    }

    const parsedSettings =
      JSON.parse(storedSettings);

    return (
      parsedSettings?.account?.displayName?.trim() ||
      "Tanio User"
    );
  } catch {
    return "Tanio User";
  }
}

function UserProfilePanel() {
  const [profileOpen, setProfileOpen] =
    useState(false);

  const [displayName, setDisplayName] =
    useState(getDisplayName);

  useEffect(() => {
    const updateProfile = () => {
      setDisplayName(getDisplayName());
    };

    window.addEventListener(
      "tanio-settings-updated",
      updateProfile
    );

    window.addEventListener(
      "storage",
      updateProfile
    );

    return () => {
      window.removeEventListener(
        "tanio-settings-updated",
        updateProfile
      );

      window.removeEventListener(
        "storage",
        updateProfile
      );
    };
  }, []);

  const user = {
    username: displayName,
    email: "user@tanio.ai",
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          setProfileOpen(
            (current) => !current
          )
        }
        className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-slate-800"
        aria-label="Open user profile"
        aria-expanded={profileOpen}
        aria-controls="user-profile-panel"
        data-testid="profile-button"
      >
        <FaUserCircle className="text-3xl text-cyan-400" />

        <div className="text-left">
          <p className="text-sm font-semibold">
            {user.username}
          </p>

          <p className="text-xs text-slate-400">
            My Account
          </p>
        </div>
      </button>

      {profileOpen && (
        <div
          id="user-profile-panel"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-lg"
          data-testid="profile-panel"
        >
          <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
            <FaUserCircle className="shrink-0 text-5xl text-cyan-400" />

            <div className="min-w-0">
              <p className="truncate font-semibold">
                {user.username}
              </p>

              <p className="truncate text-sm text-slate-400">
                {user.email}
              </p>

              <p className="mt-1 text-xs text-green-400">
                Active Account
              </p>
            </div>
          </div>

          <Link
            to="/settings"
            onClick={() =>
              setProfileOpen(false)
            }
            className="mt-4 flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 transition-all duration-200 hover:bg-slate-700"
          >
            <FaCog />
            Account Settings
          </Link>
        </div>
      )}
    </div>
  );
}

export default UserProfilePanel;