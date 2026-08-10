import { useEffect, useState } from "react";
import {
  FaPalette,
  FaRobot,
  FaBell,
  FaUserCog,
  FaSave,
  FaUndo,
} from "react-icons/fa";

const SETTINGS_KEY = "tanioSettings";

const DEFAULT_SETTINGS = {
  appearance: {
    theme: "dark",
    compactLayout: false,
  },
  ai: {
    creativity: "balanced",
    responseLength: "medium",
    defaultTone: "professional",
  },
  notifications: {
    generationComplete: true,
    activityUpdates: true,
    emailNotifications: false,
  },
  account: {
    displayName: "Tanio User",
    defaultWorkspace: "",
  },
};

function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    username: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);

      if (!storedSettings) {
        setSettings(DEFAULT_SETTINGS);
        setSavedSettings(DEFAULT_SETTINGS);
        return;
      }

      const parsedSettings = JSON.parse(storedSettings);

      const mergedSettings = {
        appearance: {
          ...DEFAULT_SETTINGS.appearance,
          ...parsedSettings.appearance,
        },
        ai: {
          ...DEFAULT_SETTINGS.ai,
          ...parsedSettings.ai,
        },
        notifications: {
          ...DEFAULT_SETTINGS.notifications,
          ...parsedSettings.notifications,
        },
        account: {
          ...DEFAULT_SETTINGS.account,
          ...parsedSettings.account,
        },
      };

      setSettings(mergedSettings);
      setSavedSettings(mergedSettings);
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setSavedSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setProfileError("Sign in with a real account to manage your profile.");
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      try {
        const response = await fetch("http://127.0.0.1:8000/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);

          throw new Error(
            errorData?.detail || "Unable to load your profile."
          );
        }

        const data = await response.json();

        setProfileForm({
          username: data.username || "",
          email: data.email || "",
        });

        localStorage.setItem(
          "tanioUser",
          JSON.stringify({
            username: data.username,
            email: data.email,
          })
        );

        setSettings((currentSettings) => ({
          ...currentSettings,
          account: {
            ...currentSettings.account,
            displayName: data.username || "Tanio User",
          },
        }));

        setSavedSettings((currentSettings) => ({
          ...currentSettings,
          account: {
            ...currentSettings.account,
            displayName: data.username || "Tanio User",
          },
        }));
      } catch (err) {
        setProfileError(
          err instanceof Error
            ? err.message
            : "Unable to load your profile."
        );
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateSetting = (section, key, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [section]: {
        ...currentSettings[section],
        [key]: value,
      },
    }));

    setError("");
    setSuccessMessage("");
  };

  const updateProfileForm = (key, value) => {
    setProfileForm((currentProfile) => ({
      ...currentProfile,
      [key]: value,
    }));

    setProfileError("");
    setProfileSuccess("");
  };

  const updatePasswordForm = (key, value) => {
    setPasswordForm((currentPasswordForm) => ({
      ...currentPasswordForm,
      [key]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  const validateSettings = () => {
    return "";
  };

  const validateProfile = () => {
    const username = profileForm.username.trim();
    const email = profileForm.email.trim();

    if (!username) {
      return "Display name is required.";
    }

    if (username.length < 2) {
      return "Display name must be at least 2 characters.";
    }

    if (username.length > 50) {
      return "Display name must be 50 characters or fewer.";
    }

    if (!email) {
      return "Email address is required.";
    }

    if (!email.includes("@")) {
      return "Enter a valid email address.";
    }

    return "";
  };

  const handleSave = () => {
    const validationError = validateSettings();

    if (validationError) {
      setError(validationError);
      setSuccessMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    const cleanedSettings = {
      ...settings,
      account: {
        ...settings.account,
        displayName: profileForm.username.trim() || "Tanio User",
      },
    };

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(cleanedSettings)
      );

      window.dispatchEvent(
        new Event("tanio-settings-updated")
      );

      setSettings(cleanedSettings);
      setSavedSettings(cleanedSettings);

      setSuccessMessage("Settings saved successfully.");
    } catch {
      setError("Unable to save your settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    const validationError = validateProfile();

    if (validationError) {
      setProfileError(validationError);
      setProfileSuccess("");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setProfileError("You must be signed in to update your profile.");
      setProfileSuccess("");
      return;
    }

    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: profileForm.username.trim(),
          email: profileForm.email.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to update your profile."
        );
      }

      if (data?.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      localStorage.setItem(
        "tanioUser",
        JSON.stringify({
          username: data.username,
          email: data.email,
        })
      );

      setProfileForm({
        username: data.username,
        email: data.email,
      });

      const updatedSettings = {
        ...settings,
        account: {
          ...settings.account,
          displayName: data.username,
        },
      };

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(updatedSettings)
      );

      setSettings(updatedSettings);
      setSavedSettings(updatedSettings);

      window.dispatchEvent(
        new Event("tanio-settings-updated")
      );

      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : "Unable to update your profile."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setPasswordError("You must be signed in to update your password.");
      setPasswordSuccess("");
      return;
    }

    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required.");
      setPasswordSuccess("");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      setPasswordSuccess("");
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/me/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to update your password."
        );
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
      });

      setPasswordSuccess("Password updated successfully.");
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "Unable to update your password."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      "Reset all settings to their default values?"
    );

    if (!confirmed) {
      return;
    }

    const resetSettings = {
      ...DEFAULT_SETTINGS,
      account: {
        ...DEFAULT_SETTINGS.account,
        displayName: profileForm.username || "Tanio User",
      },
    };

    setSettings(resetSettings);
    setError("");
    setSuccessMessage("");

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(resetSettings)
      );

      window.dispatchEvent(
        new Event("tanio-settings-updated")
      );

      setSavedSettings(resetSettings);
      setSuccessMessage("Settings reset to defaults.");
    } catch {
      setError("Unable to reset settings.");
    }
  };

  const hasChanges =
    JSON.stringify(settings) !== JSON.stringify(savedSettings);

  return (
    <main className="flex-1 px-10 py-10">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">
            Settings
          </h1>

          <p className="mt-2 text-slate-400">
            Manage your Tanio AI preferences and account information.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700"
          >
            <FaUndo />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaSave />

            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-300"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Account */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-700/50 bg-cyan-950/40 text-cyan-400">
              <FaUserCog />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                My Account
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Update your display name, email address, and password.
              </p>
            </div>
          </div>

          {profileError && (
            <div
              className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div
              className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              role="status"
            >
              {profileSuccess}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label
                htmlFor="profile-display-name"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Display Name
              </label>

              <input
                id="profile-display-name"
                type="text"
                value={profileForm.username}
                onChange={(event) =>
                  updateProfileForm("username", event.target.value)
                }
                disabled={profileLoading}
                maxLength={50}
                placeholder="Enter your display name"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 disabled:opacity-50"
              />

              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>2–50 characters</span>

                <span>
                  {profileForm.username.length}/50
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email Address
              </label>

              <input
                id="profile-email"
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  updateProfileForm("email", event.target.value)
                }
                disabled={profileLoading}
                placeholder="Enter your email address"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={profileSaving || profileLoading}
              className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {profileSaving ? "Saving Profile..." : "Save Profile"}
            </button>
          </div>

          <div className="my-6 border-t border-slate-800" />

          {passwordError && (
            <div
              className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div
              className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              role="status"
            >
              {passwordSuccess}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label
                htmlFor="current-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Current Password
              </label>

              <input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  updatePasswordForm(
                    "currentPassword",
                    event.target.value
                  )
                }
                placeholder="Enter your current password"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                New Password
              </label>

              <input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(event) =>
                  updatePasswordForm(
                    "newPassword",
                    event.target.value
                  )
                }
                placeholder="Enter a new password"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />

              <p className="mt-2 text-xs text-slate-500">
                New password must be at least 6 characters.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowPasswords((currentValue) => !currentValue)}
                className="rounded-lg bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700"
              >
                {showPasswords ? "Hide Passwords" : "Show Passwords"}
              </button>

              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={passwordSaving}
                className="rounded-lg bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {passwordSaving ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-700/50 bg-cyan-950/40 text-cyan-400">
              <FaPalette />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Appearance
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Customize how Tanio AI looks and feels.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="theme"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Theme
            </label>

            <select
              id="theme"
              value={settings.appearance.theme}
              onChange={(event) =>
                updateSetting(
                  "appearance",
                  "theme",
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System Default</option>
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Choose how Tanio AI appears across the application.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-6 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <div>
              <h3 className="font-semibold text-white">
                Compact Layout
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Reduce spacing to show more content on screen.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.appearance.compactLayout}
              onClick={() =>
                updateSetting(
                  "appearance",
                  "compactLayout",
                  !settings.appearance.compactLayout
                )
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                settings.appearance.compactLayout
                  ? "bg-cyan-500"
                  : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  settings.appearance.compactLayout
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* AI Generation Defaults */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-700/50 bg-cyan-950/40 text-cyan-400">
              <FaRobot />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                AI Generation Defaults
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Choose your default preferences for AI-generated content.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="creativity"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Creativity
              </label>

              <select
                id="creativity"
                value={settings.ai.creativity}
                onChange={(event) =>
                  updateSetting(
                    "ai",
                    "creativity",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              >
                <option value="focused">Focused</option>
                <option value="balanced">Balanced</option>
                <option value="creative">Creative</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="response-length"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Response Length
              </label>

              <select
                id="response-length"
                value={settings.ai.responseLength}
                onChange={(event) =>
                  updateSetting(
                    "ai",
                    "responseLength",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="default-tone"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Default Tone
              </label>

              <select
                id="default-tone"
                value={settings.ai.defaultTone}
                onChange={(event) =>
                  updateSetting(
                    "ai",
                    "defaultTone",
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              >
                <option value="professional">
                  Professional
                </option>

                <option value="casual">
                  Casual
                </option>

                <option value="concise">
                  Concise
                </option>

                <option value="detailed">
                  Detailed
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-700/50 bg-cyan-950/40 text-cyan-400">
              <FaBell />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Notifications
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Control which application updates you want to receive.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <SettingToggle
              title="Generation Complete"
              description="Notify me when AI content finishes generating."
              enabled={
                settings.notifications.generationComplete
              }
              onToggle={() =>
                updateSetting(
                  "notifications",
                  "generationComplete",
                  !settings.notifications.generationComplete
                )
              }
            />

            <SettingToggle
              title="Activity Updates"
              description="Show notifications for project and workspace activity."
              enabled={settings.notifications.activityUpdates}
              onToggle={() =>
                updateSetting(
                  "notifications",
                  "activityUpdates",
                  !settings.notifications.activityUpdates
                )
              }
            />

            <SettingToggle
              title="Email Notifications"
              description="Allow Tanio AI to send important updates by email."
              enabled={
                settings.notifications.emailNotifications
              }
              onToggle={() =>
                updateSetting(
                  "notifications",
                  "emailNotifications",
                  !settings.notifications.emailNotifications
                )
              }
            />
          </div>
        </section>
      </div>

      {/* Unsaved Changes */}
      {hasChanges && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-200">
            You have unsaved changes.
          </p>

          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Save Changes
          </button>
        </div>
      )}
    </main>
  );
}

function SettingToggle({
  title,
  description,
  enabled,
  onToggle,
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <div>
        <h3 className="font-semibold text-white">
          {title}
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-cyan-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default Settings;