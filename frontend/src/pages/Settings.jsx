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
    defaultTone: "balanced",
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

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    confirmEmail: "",
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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

  const validateSettings = () => {
    const displayName = settings.account.displayName.trim();

    if (!displayName) {
      return "Display name is required.";
    }

    if (displayName.length < 2) {
      return "Display name must be at least 2 characters.";
    }

    if (displayName.length > 50) {
      return "Display name must be 50 characters or fewer.";
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
        displayName: settings.account.displayName.trim(),
      },
    };

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(cleanedSettings)
      );

      // Notify the rest of Tanio that settings changed.
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

  const handleReset = () => {
    const confirmed = window.confirm(
      "Reset all settings to their default values?"
    );

    if (!confirmed) {
      return;
    }

    setSettings(DEFAULT_SETTINGS);
    setError("");
    setSuccessMessage("");

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(DEFAULT_SETTINGS)
      );

      // Notify the rest of Tanio that settings were reset.
      window.dispatchEvent(
        new Event("tanio-settings-updated")
      );

      setSavedSettings(DEFAULT_SETTINGS);
      setSuccessMessage("Settings reset to defaults.");
    } catch {
      setError("Unable to reset settings.");
    }
  };

  const closeEmailModal = () => {
    if (emailSaving) {
      return;
    }

    setShowEmailModal(false);
    setEmailError("");
    setEmailSuccess("");
    setEmailForm({
      newEmail: "",
      confirmEmail: "",
    });
  };

  const updateEmailForm = (key, value) => {
    setEmailForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setEmailError("");
    setEmailSuccess("");
  };

  const handleUpdateEmail = async () => {
    const token = localStorage.getItem("token");
    const newEmail = emailForm.newEmail.trim();
    const confirmEmail = emailForm.confirmEmail.trim();

    setEmailError("");
    setEmailSuccess("");

    if (!token) {
      setEmailError("You must be signed in to update your email.");
      return;
    }

    if (!newEmail) {
      setEmailError("New email is required.");
      return;
    }

    if (newEmail !== confirmEmail) {
      setEmailError("Email addresses do not match.");
      return;
    }

    setEmailSaving(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/me/email",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            new_email: newEmail,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to update your email."
        );
      }

      if (data?.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      setEmailForm({
        newEmail: "",
        confirmEmail: "",
      });
      setEmailSuccess("Email updated successfully.");
    } catch (err) {
      setEmailError(
        err instanceof Error
          ? err.message
          : "Unable to update your email."
      );
    } finally {
      setEmailSaving(false);
    }
  };

  const closePasswordModal = () => {
    if (passwordSaving) {
      return;
    }

    setShowPasswordModal(false);
    setShowPasswords(false);
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const updatePasswordForm = (key, value) => {
    setPasswordForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleUpdatePassword = async () => {
    const token = localStorage.getItem("token");

    setPasswordError("");
    setPasswordSuccess("");

    if (!token) {
      setPasswordError("You must be signed in to update your password.");
      return;
    }

    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/me/password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: passwordForm.currentPassword,
            new_password: passwordForm.newPassword,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to update your password."
        );
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
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
            Manage your Tanio AI preferences and default settings.
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
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
              >
                Creativity
                <span
                  title="Focused stays close to your prompt. Balanced mixes practical and creative ideas. Creative encourages more imaginative and unexpected ideas."
                  className="cursor-help text-slate-500"
                  aria-label="Creativity setting help"
                >
                  ⓘ
                </span>
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
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
              >
                Response Length
                <span
                  title="Short gives a brief response. Medium adds more context and detail. Long gives a detailed, multi-section response."
                  className="cursor-help text-slate-500"
                  aria-label="Response length setting help"
                >
                  ⓘ
                </span>
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
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
              >
                Writing Style
                <span
                  title="Casual is relaxed and conversational. Balanced is clear and natural. Creative is more expressive and imaginative."
                  className="cursor-help text-slate-500"
                  aria-label="Writing style setting help"
                >
                  ⓘ
                </span>
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
                <option value="casual">Casual</option>
                <option value="balanced">Balanced</option>
                <option value="creative">Creative</option>
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

        {/* Account */}
        <section className="relative rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-700/50 bg-cyan-950/40 text-cyan-400">
              <FaUserCog />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Account Settings
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Manage your general account preferences.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="display-name"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Display Name
              </label>

              <input
                id="display-name"
                type="text"
                value={settings.account.displayName}
                onChange={(event) =>
                  updateSetting(
                    "account",
                    "displayName",
                    event.target.value
                  )
                }
                maxLength={50}
                placeholder="Enter your display name"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />

              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>2–50 characters</span>

                <span>
                  {settings.account.displayName.length}/50
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="default-workspace"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Default Workspace
              </label>

              <input
                id="default-workspace"
                type="text"
                value={settings.account.defaultWorkspace}
                onChange={(event) =>
                  updateSetting(
                    "account",
                    "defaultWorkspace",
                    event.target.value
                  )
                }
                placeholder="Optional workspace name"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />

              <p className="mt-2 text-xs text-slate-500">
                Leave blank if you do not want a default workspace.
              </p>
            </div>
          </div>

          <div className="absolute bottom-5 right-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setEmailError("");
                setEmailSuccess("");
                setShowEmailModal(true);
              }}
              className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300 hover:underline"
            >
              Update Email
            </button>

            <button
              type="button"
              onClick={() => {
                setPasswordError("");
                setPasswordSuccess("");
                setShowPasswordModal(true);
              }}
              className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300 hover:underline"
            >
              Update Password
            </button>
          </div>
        </section>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEmailModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="email-modal-title"
                  className="text-2xl font-bold text-white"
                >
                  Update Email
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Enter and confirm the new email for your account.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEmailModal}
                disabled={emailSaving}
                className="rounded-lg px-2 py-1 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close email dialog"
              >
                ×
              </button>
            </div>

            {emailError && (
              <div
                className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {emailError}
              </div>
            )}

            {emailSuccess && (
              <div
                className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                role="status"
              >
                {emailSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="new-email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  New Email
                </label>

                <input
                  id="new-email"
                  type="email"
                  value={emailForm.newEmail}
                  onChange={(event) =>
                    updateEmailForm("newEmail", event.target.value)
                  }
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                  placeholder="Enter your new email"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Confirm New Email
                </label>

                <input
                  id="confirm-email"
                  type="email"
                  value={emailForm.confirmEmail}
                  onChange={(event) =>
                    updateEmailForm("confirmEmail", event.target.value)
                  }
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                  placeholder="Re-enter your new email"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEmailModal}
                disabled={emailSaving}
                className="rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateEmail}
                disabled={emailSaving}
                className="rounded-lg bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {emailSaving ? "Updating..." : "Update Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePasswordModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="password-modal-title"
                  className="text-2xl font-bold text-white"
                >
                  Change Password
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Enter your current password and choose a new one.
                </p>
              </div>

              <button
                type="button"
                onClick={closePasswordModal}
                disabled={passwordSaving}
                className="rounded-lg px-2 py-1 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close password dialog"
              >
                ×
              </button>
            </div>

            {passwordError && (
              <div
                className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div
                className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                role="status"
              >
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
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
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                  placeholder="Enter your current password"
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
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                  placeholder="Enter a new password"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Must be at least 6 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Confirm New Password
                </label>

                <input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    updatePasswordForm(
                      "confirmPassword",
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                  placeholder="Re-enter your new password"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(event) =>
                    setShowPasswords(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                />
                Show passwords
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={passwordSaving}
                className="rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={passwordSaving}
                className="rounded-lg bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {passwordSaving
                  ? "Updating..."
                  : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

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