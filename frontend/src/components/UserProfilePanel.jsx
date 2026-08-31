import { useEffect, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  FaCog,
  FaQuestionCircle,
  FaSignOutAlt,
  FaChevronDown,
} from "react-icons/fa";

import {
  getStoredUserProfile,
  getUserInitials,
} from "../utils/userProfile";

function UserProfilePanel() {
  const navigate = useNavigate();

  const panelRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);

  const [user, setUser] = useState(getStoredUserProfile);

  useEffect(() => {
    const updateProfile = () => {
      setUser(getStoredUserProfile());
    };

    window.addEventListener(
      "tanio-settings-updated",
      updateProfile
    );

    window.addEventListener(
      "tanio-user-updated",
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
        "tanio-user-updated",
        updateProfile
      );

      window.removeEventListener(
        "storage",
        updateProfile
      );
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  const handleLogout = async () => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    try {
      if (token) {
        await fetch(
          "http://127.0.0.1:8000/auth/logout",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error(
        "Logout request failed:",
        error
      );
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("tanioSession");
      localStorage.removeItem("tanioUser");

      setProfileOpen(false);

      navigate("/signin", {
        replace: true,
      });
    }
  };

  const initials = getUserInitials(
    user.displayName
  );

  const avatarContent = user.profileImage ? (
    <img
      src={user.profileImage}
      alt={`${user.displayName} profile`}
      className="h-full w-full object-cover"
    />
  ) : (
    initials
  ); 

  return (
    <div
      ref={panelRef}
      className="relative"
    >
      {/* Profile Button */}
      <button
        type="button"
        onClick={() =>
          setProfileOpen(
            (current) => !current
          )
        }
        className={`
          group flex items-center gap-3 rounded-xl
          border px-2.5 py-1.5
          transition-all duration-200
          ${
            profileOpen
              ? "border-cyan-500/20 bg-slate-800/80"
              : "border-transparent hover:border-slate-800 hover:bg-slate-900/80"
          }
        `}
        aria-label="Open user profile"
        aria-expanded={profileOpen}
        aria-controls="user-profile-panel"
        data-testid="profile-button"
      >
        {/* Avatar */}
        <div className="relative">
          <div
            className="
              flex h-9 w-9 items-center justify-center
              overflow-hidden rounded-xl border border-cyan-500/25
              bg-gradient-to-br
              from-cyan-500/15 to-slate-800
              text-[11px] font-bold text-cyan-300
            "
          >
            {avatarContent}
          </div>

          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
        </div>

        {/* User Info */}
        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-[120px] truncate text-xs font-semibold text-slate-100">
            {user.displayName}
          </p>

          <p className="mt-0.5 max-w-[140px] truncate text-[10px] text-slate-500">
            {user.email || "My Account"}
          </p>
        </div>

        <FaChevronDown
          className={`
            hidden text-[8px] text-slate-600
            transition-transform duration-200
            sm:block
            ${
              profileOpen
                ? "rotate-180 text-cyan-400"
                : ""
            }
          `}
        />
      </button>

      {/* Dropdown */}
      {profileOpen && (
        <div
          id="user-profile-panel"
          data-testid="profile-panel"
          className="
            absolute right-0 top-full z-50 mt-3
            w-72 overflow-hidden rounded-2xl
            border border-slate-800
            bg-slate-900/95
            shadow-2xl shadow-black/40
            backdrop-blur-xl
          "
        >
          {/* Profile Header */}
          <div className="relative overflow-hidden border-b border-slate-800 p-4">
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-500/[0.06] blur-2xl" />

            <div className="relative flex items-center gap-3">
              <div className="relative">
                <div
                  className="
                    flex h-11 w-11 items-center
                    justify-center overflow-hidden rounded-xl
                    border border-cyan-500/25
                    bg-gradient-to-br
                    from-cyan-500/15 to-slate-800
                    text-xs font-bold text-cyan-300
                  "
                >
                  {avatarContent}
                </div>

                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user.displayName}
                </p>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {user.email ||
                    "Signed in to Tanio"}
                </p>
              </div>
            </div>

            <div className="relative mt-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <span className="text-[10px] font-medium text-emerald-400">
                Active Account
              </span>
            </div>
          </div>

          {/* Menu */}
          <div className="p-2">
            <Link
              to="/settings"
              onClick={() =>
                setProfileOpen(false)
              }
              className="
                group flex items-center gap-3
                rounded-xl px-3 py-2.5
                text-sm text-slate-300
                transition-all duration-200
                hover:bg-slate-800
                hover:text-white
              "
            >
              <span
                className="
                  flex h-8 w-8 items-center
                  justify-center rounded-lg
                  border border-slate-700
                  bg-slate-800/60
                  text-slate-500
                  transition-all
                  group-hover:border-cyan-500/20
                  group-hover:text-cyan-300
                "
              >
                <FaCog className="text-xs" />
              </span>

              <div>
                <p className="font-medium">
                  Account Settings
                </p>

                <p className="mt-0.5 text-[10px] text-slate-600">
                  Profile and preferences
                </p>
              </div>
            </Link>

            <Link
              to="/help"
              onClick={() =>
                setProfileOpen(false)
              }
              className="
                group mt-1 flex items-center
                gap-3 rounded-xl px-3 py-2.5
                text-sm text-slate-300
                transition-all duration-200
                hover:bg-slate-800
                hover:text-white
              "
            >
              <span
                className="
                  flex h-8 w-8 items-center
                  justify-center rounded-lg
                  border border-slate-700
                  bg-slate-800/60
                  text-slate-500
                  transition-all
                  group-hover:border-cyan-500/20
                  group-hover:text-cyan-300
                "
              >
                <FaQuestionCircle className="text-xs" />
              </span>

              <div>
                <p className="font-medium">
                  Help Guide
                </p>

                <p className="mt-0.5 text-[10px] text-slate-600">
                  Learn how Tanio works
                </p>
              </div>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-800 p-2">
            <button
              type="button"
              onClick={handleLogout}
              className="
                group flex w-full items-center
                gap-3 rounded-xl px-3 py-2.5
                text-left text-sm text-slate-400
                transition-all duration-200
                hover:bg-red-500/[0.08]
                hover:text-red-400
              "
            >
              <span
                className="
                  flex h-8 w-8 items-center
                  justify-center rounded-lg
                  border border-slate-700
                  bg-slate-800/60
                  transition-all
                  group-hover:border-red-500/20
                  group-hover:bg-red-500/10
                "
              >
                <FaSignOutAlt className="text-xs" />
              </span>

              <div>
                <p className="font-medium">
                  Sign Out
                </p>

                <p className="mt-0.5 text-[10px] text-slate-600 group-hover:text-red-400/50">
                  End your Tanio session
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfilePanel;