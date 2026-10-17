import { useEffect, useRef, useState } from "react";
import {
  FaPalette,
  FaRobot,
  FaBell,
  FaUserCog,
  FaSave,
  FaUndo,
} from "react-icons/fa";

const API_URL = "http://127.0.0.1:8000";
const SETTINGS_KEY = "tanioSettings";
const SELECTED_MODULES_KEY = "tanioSelectedModules";

const TANIO_MODULES = [
  {
    id: "product-architect",
    name: "Product Architect",
    description: "Product planning, personas, roadmaps, and technical documents.",
  },
  {
    id: "tabletop-creator",
    name: "Tabletop Creator",
    description: "Characters, quests, encounters, locations, and tabletop worlds.",
  },
  {
    id: "problem-solver",
    name: "Problem Solver",
    description: "Structured analysis and practical solutions for complex problems.",
  },
  {
    id: "learning-studio",
    name: "Learning Studio",
    description: "AI-generated lessons, flashcards, and quizzes for studying new topics.",
  },
];

const VALID_MODULE_IDS = TANIO_MODULES.map((module) => module.id);

const DEFAULT_MODULE_COLORS = {
  "product-architect": "#06b6d4",
  "tabletop-creator": "#9333ea",
  "problem-solver": "#10b981",
  "learning-studio": "#06b6d4",
};

const DEFAULT_SETTINGS = {
  autoSave: {
    enabled: false,
  },
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
    profileImage: "",
  },
};

const AI_FIELDS = [
  {
    key: "creativity",
    label: "Creativity",
    help: "Focused stays close to your prompt. Balanced mixes practical and creative ideas. Creative encourages more imaginative ideas.",
    options: [
      ["focused", "Focused"],
      ["balanced", "Balanced"],
      ["creative", "Creative"],
    ],
  },
  {
    key: "responseLength",
    label: "Response Length",
    help: "Short gives a brief response. Medium adds context and detail. Long gives a detailed response.",
    options: [
      ["short", "Short"],
      ["medium", "Medium"],
      ["long", "Long"],
    ],
  },
  {
    key: "defaultTone",
    label: "Writing Style",
    help: "Casual is conversational. Balanced is clear and natural. Creative is expressive and imaginative.",
    options: [
      ["casual", "Casual"],
      ["balanced", "Balanced"],
      ["creative", "Creative"],
    ],
  },
];

const NOTIFICATION_FIELDS = [
  {
    key: "generationComplete",
    title: "Generation Complete",
    description: "Notify me when AI content finishes generating.",
  },
  {
    key: "activityUpdates",
    title: "Activity Updates",
    description: "Show notifications for project and workspace activity.",
  },
  {
    key: "emailNotifications",
    title: "Email Notifications",
    description: "Allow Tanio AI to send important updates by email.",
  },
];

const FIELD_CLASS =
  "w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50";

const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

function readSettings() {
  const parsed = JSON.parse(
    localStorage.getItem(SETTINGS_KEY) || "{}"
  );

  const stored =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};

  const merged = { ...stored };

  Object.keys(DEFAULT_SETTINGS).forEach((section) => {
    const storedSection =
      stored[section] &&
      typeof stored[section] === "object" &&
      !Array.isArray(stored[section])
        ? stored[section]
        : {};

    merged[section] = {
      ...DEFAULT_SETTINGS[section],
      ...storedSection,
    };
  });

  if (!["light", "dark", "system"].includes(merged.appearance.theme)) {
    merged.appearance.theme = "dark";
  }

  merged.appearance.compactLayout =
    merged.appearance.compactLayout === true;

  if (typeof merged.account.displayName !== "string") {
    merged.account.displayName = DEFAULT_SETTINGS.account.displayName;
  }

  if (typeof merged.account.defaultWorkspace !== "string") {
    merged.account.defaultWorkspace = "";
  }

  if (typeof merged.account.profileImage !== "string") {
    merged.account.profileImage = "";
  }

  return merged;
}

function getInitialSettings() {
  try {
    return readSettings();
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getStoredModules() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SELECTED_MODULES_KEY) || "[]"
    );

    return Array.isArray(stored)
      ? stored.filter((moduleId) => VALID_MODULE_IDS.includes(moduleId))
      : [];
  } catch {
    return [];
  }
}

function getRequestError(data, fallback) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return (
      data.detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(" ") || fallback
    );
  }

  return fallback;
}

function parseModuleColors(data) {
  if (!Number.isInteger(data?.user_id)) {
    throw new Error("The server returned an invalid account response.");
  }

  const colors = {};

  for (const module of TANIO_MODULES) {
    const color = data?.module_colors?.[module.id];

    if (
      typeof color !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(color)
    ) {
      throw new Error("The server returned invalid module colors.");
    }

    colors[module.id] = color.toLowerCase();
  }

  return {
    user_id: data.user_id,
    module_colors: colors,
  };
}

function ModuleColorSettings() {
  const [colors, setColors] = useState({
    ...DEFAULT_MODULE_COLORS,
  });
  const [savedColors, setSavedColors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const mountedRef = useRef(false);
  const requestBusyRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("token");
    let active = true;

    setLoading(true);
    setError("");
    setSuccess("");
    setSavedColors(null);

    const loadColors = async () => {
      try {
        if (!token) {
          throw new Error(
            "Please sign in to load your module colors."
          );
        }

        const response = await fetch(
          `${API_URL}/auth/me/module-colors`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            getRequestError(
              data,
              "Unable to load your module colors."
            )
          );
        }

        const result = parseModuleColors(data);

        if (
          !active ||
          localStorage.getItem("token") !== token
        ) {
          return;
        }

        setColors(result.module_colors);
        setSavedColors(result.module_colors);
      } catch (requestError) {
        if (
          active &&
          requestError.name !== "AbortError" &&
          localStorage.getItem("token") === token
        ) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load your module colors."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadColors();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  const persistColors = async (reset = false) => {
    if (
      requestBusyRef.current ||
      loading ||
      !savedColors
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please sign in to save your module colors.");
      return;
    }

    requestBusyRef.current = true;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/auth/me/module-colors`,
        {
          method: reset ? "DELETE" : "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(reset
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(reset
            ? {}
            : {
                body: JSON.stringify({
                  module_colors: colors,
                }),
              }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getRequestError(
            data,
            "Unable to save your module colors."
          )
        );
      }

      const result = parseModuleColors(data);

      if (localStorage.getItem("token") !== token) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent("tanio-module-colors-updated", {
          detail: result,
        })
      );

      if (!mountedRef.current) {
        return;
      }

      setColors(result.module_colors);
      setSavedColors(result.module_colors);
      setSuccess(
        reset
          ? "Default module colors restored."
          : "Module colors saved to your account."
      );
    } catch (requestError) {
      if (
        mountedRef.current &&
        localStorage.getItem("token") === token
      ) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to save your module colors."
        );
      }
    } finally {
      requestBusyRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const busy = loading || saving;

  const hasChanges =
    savedColors !== null &&
    TANIO_MODULES.some(
      (module) =>
        colors[module.id] !== savedColors[module.id]
    );

  return (
    <SettingsSection
      title="Module Colors"
      description="Choose an accent color for each AI tool. Save your choices to your account."
      icon={FaPalette}
      wide
    >
      {loading && (
        <p
          role="status"
          className="mb-4 text-sm text-slate-400"
        >
          Loading your module colors...
        </p>
      )}

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {TANIO_MODULES.map((module) => (
          <div
            key={module.id}
            className="min-w-0 rounded-xl border border-slate-700 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor={`module-color-${module.id}`}
                className="font-semibold text-white"
              >
                {module.name}
              </label>

              <input
                id={`module-color-${module.id}`}
                type="color"
                value={colors[module.id]}
                disabled={busy || !savedColors}
                onChange={(event) => {
                  const value = event.target.value;

                  setColors((current) => ({
                    ...current,
                    [module.id]: value,
                  }));

                  setError("");
                  setSuccess("");
                }}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-700 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div
              className="mt-4 flex items-center gap-3 rounded-lg border p-3"
              style={{
                borderColor: colors[module.id],
                backgroundColor: `${colors[module.id]}14`,
              }}
            >
              <span
                aria-hidden="true"
                className="h-9 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: colors[module.id],
                }}
              />

              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  {module.name} preview
                </p>

                <p className="mt-1 font-mono text-xs text-slate-400">
                  {colors[module.id].toUpperCase()}
                </p>
              </div>

              <span
                aria-hidden="true"
                className="ml-auto h-7 w-7 shrink-0 rounded-lg"
                style={{
                  backgroundColor: colors[module.id],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <Feedback message={error} />}
      {success && <Feedback message={success} success />}

      {!loading && !savedColors ? (
        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className={`${SECONDARY_BUTTON} mt-4`}
        >
          Retry Loading Colors
        </button>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || !hasChanges}
            onClick={() => persistColors(false)}
            className={PRIMARY_BUTTON}
          >
            <FaSave aria-hidden="true" />
            {saving ? "Saving..." : "Save Module Colors"}
          </button>

          <button
            type="button"
            disabled={busy || !savedColors}
            onClick={() => persistColors(true)}
            className={SECONDARY_BUTTON}
          >
            <FaUndo aria-hidden="true" />
            Reset Module Colors
          </button>

          {hasChanges && (
            <p className="text-sm text-slate-400">
              You have unsaved color changes.
            </p>
          )}
        </div>
      )}
    </SettingsSection>
  );
}

function Settings() {
  const [settings, setSettings] = useState(getInitialSettings);
  const [savedSettings, setSavedSettings] = useState(getInitialSettings);

  const settingsRef = useRef(settings);
  const moduleSavingRef = useRef(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedModules, setSelectedModules] = useState(getStoredModules);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleError, setModuleError] = useState("");
  const [moduleSuccess, setModuleSuccess] = useState("");

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

  const applyLocalSettings = (nextSettings) => {
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
  };

  useEffect(() => {
    const syncSavedSettings = () => {
      try {
        const persisted = readSettings();

        const nextSettings = {
          ...persisted,
          account: settingsRef.current.account,
        };

        settingsRef.current = nextSettings;
        setSettings(nextSettings);
        setSavedSettings(persisted);
      } catch (syncError) {
        console.error(
          "Settings synchronization failed:",
          syncError
        );
      }
    };

    const handleStorage = (event) => {
      if (
        event.key === SETTINGS_KEY ||
        event.key === null
      ) {
        syncSavedSettings();
      }
    };

    window.addEventListener(
      "tanio-settings-updated",
      syncSavedSettings
    );
    window.addEventListener("storage", handleStorage);

    syncSavedSettings();

    return () => {
      window.removeEventListener(
        "tanio-settings-updated",
        syncSavedSettings
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const controller = new AbortController();

    const loadSelectedModules = async () => {
      try {
        if (!token) {
          throw new Error(
            "You must be signed in to load your modules."
          );
        }

        const response = await fetch(
          `${API_URL}/auth/me/interests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            getRequestError(
              data,
              "Unable to load your modules."
            )
          );
        }

        if (
          controller.signal.aborted ||
          localStorage.getItem("token") !== token
        ) {
          return;
        }

        const savedModules = Array.isArray(data?.selected_modules)
          ? data.selected_modules.filter((moduleId) =>
              VALID_MODULE_IDS.includes(moduleId)
            )
          : [];

        setSelectedModules(savedModules);

        localStorage.setItem(
          SELECTED_MODULES_KEY,
          JSON.stringify(savedModules)
        );
      } catch (requestError) {
        if (
          !controller.signal.aborted &&
          localStorage.getItem("token") === token
        ) {
          setModuleError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load your modules."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setModulesLoading(false);
        }
      }
    };

    loadSelectedModules();

    return () => controller.abort();
  }, []);

  const saveSelectedModules = async (modulesToSave) => {
    if (moduleSavingRef.current || modulesLoading) {
      return;
    }

    if (modulesToSave.length === 0) {
      setModuleError("Keep at least one module enabled.");
      setModuleSuccess("");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setModuleError(
        "You must be signed in to update your modules."
      );
      setModuleSuccess("");
      return;
    }

    moduleSavingRef.current = true;
    setModuleSaving(true);
    setModuleError("");
    setModuleSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/auth/me/interests`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            selected_modules: modulesToSave,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getRequestError(
            data,
            "Unable to update your modules."
          )
        );
      }

      if (localStorage.getItem("token") !== token) {
        return;
      }

      const savedModules = Array.isArray(data?.selected_modules)
        ? data.selected_modules.filter((moduleId) =>
            VALID_MODULE_IDS.includes(moduleId)
          )
        : modulesToSave;

      setSelectedModules(savedModules);

      localStorage.setItem(
        SELECTED_MODULES_KEY,
        JSON.stringify(savedModules)
      );

      window.dispatchEvent(
        new CustomEvent("tanio-modules-updated", {
          detail: savedModules,
        })
      );

      setModuleSuccess(
        "Your enabled modules were updated."
      );
    } catch (requestError) {
      if (localStorage.getItem("token") === token) {
        setModuleError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to update your modules."
        );
      }
    } finally {
      moduleSavingRef.current = false;
      setModuleSaving(false);
    }
  };

  const handleModuleToggle = (moduleId) => {
    const nextModules = selectedModules.includes(moduleId)
      ? selectedModules.filter(
          (selectedId) => selectedId !== moduleId
        )
      : [...selectedModules, moduleId];

    saveSelectedModules(nextModules);
  };

  const updateSetting = (section, key, value) => {
    const current = settingsRef.current;

    applyLocalSettings({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    });

    setError("");
    setSuccessMessage("");
  };

  const autoSaveSetting = (section, key, value) => {
    try {
      const persisted = readSettings();

      const updatedSettings = {
        ...persisted,
        [section]: {
          ...persisted[section],
          [key]: value,
        },
      };

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(updatedSettings)
      );

      applyLocalSettings({
        ...updatedSettings,
        account: settingsRef.current.account,
      });

      setSavedSettings(updatedSettings);
      setError("");
      setSuccessMessage("");

      window.dispatchEvent(
        new Event("tanio-settings-updated")
      );
    } catch {
      setError("Unable to save your settings.");
      setSuccessMessage("");
    }
  };

  const handleProfileImageUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      setSuccessMessage("");
      return;
    }

    if (file.size > 1024 * 1024) {
      setError("Profile image must be 1MB or smaller.");
      setSuccessMessage("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateSetting(
          "account",
          "profileImage",
          reader.result
        );
      }
    };

    reader.onerror = () => {
      setError("Unable to upload profile image.");
      setSuccessMessage("");
    };

    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const account = settingsRef.current.account;
    const displayName = account.displayName.trim();

    if (
      displayName.length < 2 ||
      displayName.length > 50
    ) {
      setError(
        "Display name must contain between 2 and 50 characters."
      );
      setSuccessMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const persisted = readSettings();

      const cleanedSettings = {
        ...persisted,
        account: {
          ...account,
          displayName,
        },
      };

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(cleanedSettings)
      );

      applyLocalSettings(cleanedSettings);
      setSavedSettings(cleanedSettings);

      window.dispatchEvent(
        new Event("tanio-settings-updated")
      );

      setSuccessMessage("Settings saved successfully.");
    } catch {
      setError("Unable to save your settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      "Reset appearance, AI, notification, and account preferences to their defaults? Module colors have their own reset button."
    );

    if (!confirmed) {
      return;
    }

    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(DEFAULT_SETTINGS)
      );

      applyLocalSettings(DEFAULT_SETTINGS);
      setSavedSettings(DEFAULT_SETTINGS);
      setError("");
      setSuccessMessage("Settings reset to defaults.");

      window.dispatchEvent(
        new Event("tanio-settings-updated")
      );
    } catch {
      setError("Unable to reset settings.");
      setSuccessMessage("");
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
    setEmailForm((current) => ({
      ...current,
      [key]: value,
    }));

    setEmailError("");
    setEmailSuccess("");
  };

  const handleUpdateEmail = async (event) => {
    event.preventDefault();

    if (emailSaving) {
      return;
    }

    const token = localStorage.getItem("token");
    const newEmail = emailForm.newEmail.trim();
    const confirmEmail = emailForm.confirmEmail.trim();

    setEmailError("");
    setEmailSuccess("");

    if (!token) {
      setEmailError(
        "You must be signed in to update your email."
      );
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
        `${API_URL}/auth/me/email`,
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
          getRequestError(
            data,
            "Unable to update your email."
          )
        );
      }

      if (localStorage.getItem("token") !== token) {
        return;
      }

      if (data?.access_token) {
        localStorage.setItem(
          "token",
          data.access_token
        );
      }

      setEmailForm({
        newEmail: "",
        confirmEmail: "",
      });
      setEmailSuccess("Email updated successfully.");
    } catch (requestError) {
      setEmailError(
        requestError instanceof Error
          ? requestError.message
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
    setPasswordForm((current) => ({
      ...current,
      [key]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();

    if (passwordSaving) {
      return;
    }

    const token = localStorage.getItem("token");

    setPasswordError("");
    setPasswordSuccess("");

    if (!token) {
      setPasswordError(
        "You must be signed in to update your password."
      );
      return;
    }

    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError(
        "New password must be at least 6 characters long."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/me/password`,
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
          getRequestError(
            data,
            "Unable to update your password."
          )
        );
      }

      if (localStorage.getItem("token") !== token) {
        return;
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswords(false);
      setPasswordSuccess(
        "Password updated successfully."
      );
    } catch (requestError) {
      setPasswordError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update your password."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const hasChanges =
    JSON.stringify(settings.account) !==
    JSON.stringify(savedSettings.account);

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">
            Settings
          </h1>
          <p className="mt-2 text-slate-400">
            Manage your Tanio AI preferences and default settings.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className={SECONDARY_BUTTON}
        >
          <FaUndo aria-hidden="true" />
          Reset Defaults
        </button>
      </div>

      {error && <Feedback message={error} />}
      {successMessage && (
        <Feedback message={successMessage} success />
      )}

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        <SettingsSection
          title="Auto-Save"
          description="Automatically save generated module content when it finishes."
          icon={FaSave}
          wide
        >
          <SettingToggle
            title="Auto-Save"
            description="When turned on, Product Architect, Tabletop Creator, and Problem Solver results will save automatically."
            enabled={settings.autoSave.enabled}
            onToggle={() =>
              autoSaveSetting(
                "autoSave",
                "enabled",
                !settings.autoSave.enabled
              )
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Enabled Modules"
          description="Choose which Tanio AI tools appear on your dashboard and sidebar."
          icon={FaRobot}
          wide
        >
          {modulesLoading && (
            <p
              role="status"
              className="mb-4 text-sm text-slate-400"
            >
              Loading your modules...
            </p>
          )}

          <div className="space-y-4">
            {TANIO_MODULES.map((module) => (
              <SettingToggle
                key={module.id}
                title={module.name}
                description={module.description}
                enabled={selectedModules.includes(module.id)}
                onToggle={() =>
                  handleModuleToggle(module.id)
                }
                disabled={moduleSaving || modulesLoading}
              />
            ))}
          </div>

          {moduleError && (
            <Feedback message={moduleError} />
          )}
          {moduleSuccess && (
            <Feedback message={moduleSuccess} success />
          )}
        </SettingsSection>

        <ModuleColorSettings />

        <SettingsSection
          title="Appearance"
          description="Customize how Tanio AI looks and feels."
          icon={FaPalette}
        >
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
              autoSaveSetting(
                "appearance",
                "theme",
                event.target.value
              )
            }
            className={FIELD_CLASS}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System Default</option>
          </select>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Applies immediately and stays synchronized with the
            header toggle. System Default follows your device.
          </p>

          <div className="mt-6">
            <SettingToggle
              title="Compact Layout"
              description="Reduce spacing to show more content on screen."
              enabled={settings.appearance.compactLayout}
              onToggle={() =>
                autoSaveSetting(
                  "appearance",
                  "compactLayout",
                  !settings.appearance.compactLayout
                )
              }
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="AI Generation Defaults"
          description="Choose your default preferences for AI-generated content."
          icon={FaRobot}
        >
          <div className="space-y-5">
            {AI_FIELDS.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`ai-${field.key}`}
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300"
                >
                  {field.label}
                  <span
                    title={field.help}
                    aria-label={field.help}
                    className="cursor-help text-slate-500"
                  >
                    ⓘ
                  </span>
                </label>

                <select
                  id={`ai-${field.key}`}
                  value={settings.ai[field.key]}
                  onChange={(event) =>
                    autoSaveSetting(
                      "ai",
                      field.key,
                      event.target.value
                    )
                  }
                  className={FIELD_CLASS}
                >
                  {field.options.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          description="Control which application updates you want to receive."
          icon={FaBell}
        >
          <div className="space-y-4">
            {NOTIFICATION_FIELDS.map((item) => (
              <SettingToggle
                key={item.key}
                title={item.title}
                description={item.description}
                enabled={settings.notifications[item.key]}
                onToggle={() =>
                  autoSaveSetting(
                    "notifications",
                    item.key,
                    !settings.notifications[item.key]
                  )
                }
              />
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Account Settings"
          description="Manage your general account preferences."
          icon={FaUserCog}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <label
                htmlFor="profile-image"
                className="mb-3 block text-sm font-medium text-slate-300"
              >
                Profile Image
              </label>

              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-xl font-bold text-cyan-500">
                  {settings.account.profileImage ? (
                    <img
                      src={settings.account.profileImage}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    settings.account.displayName
                      ?.charAt(0)
                      ?.toUpperCase() || "T"
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:font-semibold file:text-slate-950 hover:file:bg-cyan-400"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Upload a square image if possible.
                    Maximum size: 1MB.
                  </p>

                  {settings.account.profileImage && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSetting(
                          "account",
                          "profileImage",
                          ""
                        )
                      }
                      className="mt-3 text-xs font-semibold text-red-400 hover:underline"
                    >
                      Remove Profile Image
                    </button>
                  )}
                </div>
              </div>
            </div>

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
                className={FIELD_CLASS}
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
                className={FIELD_CLASS}
              />

              <p className="mt-2 text-xs text-slate-500">
                Leave blank if you do not want a default workspace.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={() => {
                setEmailError("");
                setEmailSuccess("");
                setShowEmailModal(true);
              }}
              className={SECONDARY_BUTTON}
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
              className={SECONDARY_BUTTON}
            >
              Update Password
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={PRIMARY_BUTTON}
            >
              <FaSave aria-hidden="true" />
              {saving
                ? "Saving..."
                : "Save Account Settings"}
            </button>
          </div>
        </SettingsSection>
      </div>

      {showEmailModal && (
        <AccountModal
          title="Update Email"
          description="Enter and confirm the new email for your account."
          titleId="email-modal-title"
          busy={emailSaving}
          onClose={closeEmailModal}
        >
          {emailError && (
            <Feedback message={emailError} />
          )}
          {emailSuccess && (
            <Feedback message={emailSuccess} success />
          )}

          <form onSubmit={handleUpdateEmail}>
            <div className="space-y-4">
              {[
                ["newEmail", "New Email", "Enter your new email"],
                [
                  "confirmEmail",
                  "Confirm New Email",
                  "Re-enter your new email",
                ],
              ].map(([key, label, placeholder]) => (
                <div key={key}>
                  <label
                    htmlFor={`email-${key}`}
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    {label}
                  </label>

                  <input
                    id={`email-${key}`}
                    type="email"
                    value={emailForm[key]}
                    onChange={(event) =>
                      updateEmailForm(
                        key,
                        event.target.value
                      )
                    }
                    autoComplete="email"
                    disabled={emailSaving}
                    placeholder={placeholder}
                    required
                    className={FIELD_CLASS}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeEmailModal}
                disabled={emailSaving}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={emailSaving}
                className={PRIMARY_BUTTON}
              >
                {emailSaving
                  ? "Updating..."
                  : "Update Email"}
              </button>
            </div>
          </form>
        </AccountModal>
      )}

      {showPasswordModal && (
        <AccountModal
          title="Change Password"
          description="Enter your current password and choose a new one."
          titleId="password-modal-title"
          busy={passwordSaving}
          onClose={closePasswordModal}
        >
          {passwordError && (
            <Feedback message={passwordError} />
          )}
          {passwordSuccess && (
            <Feedback message={passwordSuccess} success />
          )}

          <form onSubmit={handleUpdatePassword}>
            <div className="space-y-4">
              {[
                [
                  "currentPassword",
                  "Current Password",
                  "current-password",
                ],
                [
                  "newPassword",
                  "New Password",
                  "new-password",
                ],
                [
                  "confirmPassword",
                  "Confirm New Password",
                  "new-password",
                ],
              ].map(([key, label, autoComplete]) => (
                <div key={key}>
                  <label
                    htmlFor={`password-${key}`}
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    {label}
                  </label>

                  <input
                    id={`password-${key}`}
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm[key]}
                    onChange={(event) =>
                      updatePasswordForm(
                        key,
                        event.target.value
                      )
                    }
                    autoComplete={autoComplete}
                    disabled={passwordSaving}
                    placeholder={label}
                    required
                    minLength={
                      key === "currentPassword"
                        ? undefined
                        : 6
                    }
                    className={FIELD_CLASS}
                  />

                  {key === "newPassword" && (
                    <p className="mt-2 text-xs text-slate-500">
                      Must be at least 6 characters.
                    </p>
                  )}
                </div>
              ))}

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(event) =>
                    setShowPasswords(event.target.checked)
                  }
                  disabled={passwordSaving}
                  className="h-4 w-4"
                />
                Show passwords
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={passwordSaving}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={passwordSaving}
                className={PRIMARY_BUTTON}
              >
                {passwordSaving
                  ? "Updating..."
                  : "Update Password"}
              </button>
            </div>
          </form>
        </AccountModal>
      )}
    </main>
  );
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  wide = false,
  children,
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6 ${
        wide ? "xl:col-span-2" : ""
      }`}
    >
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-700/50 bg-cyan-950/40 text-cyan-500">
          <Icon aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function SettingToggle({
  title,
  description,
  enabled,
  onToggle,
  disabled = false,
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <div className="min-w-0">
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
        aria-label={title}
        aria-checked={Boolean(enabled)}
        onClick={onToggle}
        disabled={disabled}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${
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

function Feedback({ message, success = false }) {
  return (
    <div
      role={success ? "status" : "alert"}
      className={`my-4 rounded-xl border px-4 py-3 text-sm ${
        success
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      }`}
    >
      {message}
    </div>
  );
}

function AccountModal({
  title,
  description,
  titleId,
  busy,
  onClose,
  children,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;

    const getFocusableElements = () =>
      Array.from(
        dialog?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
        ) || []
      ).filter((element) => element.getClientRects().length > 0);

    const focusable = getFocusableElements();

    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      dialog?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const elements = getFocusableElements();

      if (elements.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[90vh] w-full min-w-0 max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl outline-none"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-2xl font-bold text-white"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={`Close ${title.toLowerCase()} dialog`}
            className="shrink-0 rounded-lg px-2 py-1 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default Settings;