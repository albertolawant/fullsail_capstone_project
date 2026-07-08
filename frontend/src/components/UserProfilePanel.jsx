import { useState } from "react";
import { Link } from "react-router-dom";
import { FaUserCircle, FaCog } from "react-icons/fa";

function UserProfilePanel() {
  const [profileOpen, setProfileOpen] = useState(false);

  // Temporary user data until authentication is connected.
  const user = {
    username: "Tanio User",
    email: "user@tanio.ai",
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setProfileOpen((current) => !current)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-all duration-200"
        aria-label="Open user profile"
        aria-expanded={profileOpen}
        aria-controls="user-profile-panel"
        data-testid="profile-button"
      >
        <FaUserCircle className="text-3xl text-cyan-400" />

        <div className="text-left">
          <p className="text-sm font-semibold">{user.username}</p>
          <p className="text-xs text-slate-400">My Account</p>
        </div>
      </button>

      {profileOpen && (
        <div
          id="user-profile-panel"
          className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-lg p-4 z-50"
          data-testid="profile-panel"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
            <FaUserCircle className="text-5xl text-cyan-400 shrink-0" />

            <div className="min-w-0">
              <p className="font-semibold truncate">{user.username}</p>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
              <p className="text-xs text-green-400 mt-1">Active Account</p>
            </div>
          </div>

          <Link
            to="/settings"
            onClick={() => setProfileOpen(false)}
            className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all duration-200"
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