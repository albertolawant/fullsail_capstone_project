import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/Topbar";
import InterestSelectionModal from "./components/InterestSelectionModal";

import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Content from "./pages/Content";
import Community from "./pages/Community";
import Settings from "./pages/Settings";
import ProductArchitect from "./pages/ProductArchitect";
import TabletopCreator from "./pages/TabletopCreator";
import ProblemSolver from "./pages/ProblemSolver";
import LearningStudio from "./pages/LearningStudio";
import HelpGuide from "./pages/HelpGuide";

const API_URL = "http://127.0.0.1:8000";

const SETTINGS_KEY = "tanioSettings";
const DASHBOARD_MODE_KEY = "tanioDashboardMode";
const SELECTED_MODULES_KEY = "tanioSelectedModules";
const INTEREST_PROMPT_KEY = "tanioInterestPromptPending";

const VALID_MODULE_IDS = [
  "product-architect",
  "tabletop-creator",
  "problem-solver",
  "learning-studio",
];

const DEFAULT_MODULE_COLORS = {
  "product-architect": "#06b6d4",
  "tabletop-creator": "#9333ea",
  "problem-solver": "#10b981",
  "learning-studio": "#06b6d4",
};

function getStoredAppearance() {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    const parsedSettings = storedSettings
      ? JSON.parse(storedSettings)
      : {};

    const storedTheme = parsedSettings?.appearance?.theme;

    return {
      theme: ["dark", "light", "system"].includes(storedTheme)
        ? storedTheme
        : "dark",
      compactLayout:
        parsedSettings?.appearance?.compactLayout === true,
    };
  } catch {
    return {
      theme: "dark",
      compactLayout: false,
    };
  }
}

function getStoredDashboardMode() {
  return localStorage.getItem(DASHBOARD_MODE_KEY) === "advanced"
    ? "advanced"
    : "basic";
}

function getStoredSelectedModules() {
  try {
    const storedModules = JSON.parse(
      localStorage.getItem(SELECTED_MODULES_KEY) || "[]"
    );

    return Array.isArray(storedModules)
      ? storedModules.filter((moduleId) =>
          VALID_MODULE_IDS.includes(moduleId)
        )
      : [];
  } catch {
    return [];
  }
}

function parseModuleColorResponse(data) {
  if (!Number.isInteger(data?.user_id)) {
    throw new Error("The server returned an invalid account response.");
  }

  const colors = {};

  for (const moduleId of VALID_MODULE_IDS) {
    const color = data?.module_colors?.[moduleId];

    if (
      typeof color !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(color)
    ) {
      throw new Error("The server returned invalid module colors.");
    }

    colors[moduleId] = color.toLowerCase();
  }

  return {
    userId: data.user_id,
    colors,
  };
}

function App() {
  const location = useLocation();

  const [appearance, setAppearance] = useState(getStoredAppearance);

  const [systemIsDark, setSystemIsDark] = useState(
    () =>
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ??
      true
  );

  const [dashboardMode, setDashboardMode] = useState(
    getStoredDashboardMode
  );

  const [selectedModules, setSelectedModules] = useState(
    getStoredSelectedModules
  );

  const [showInterestModal, setShowInterestModal] = useState(false);

  const [moduleColorState, setModuleColorState] = useState({
    token: null,
    userId: null,
    colors: { ...DEFAULT_MODULE_COLORS },
  });

  // Refresh session values when another tab signs in or out.
  const [, refreshSession] = useState(0);

  const isSignInPage = location.pathname === "/signin";
  const isSignedIn =
    localStorage.getItem("tanioSession") === "true";
  const token = localStorage.getItem("token");

  const resolvedTheme =
    appearance.theme === "system"
      ? systemIsDark
        ? "dark"
        : "light"
      : appearance.theme;

  // Never display another session's saved colors.
  const moduleColors =
    isSignedIn &&
    token &&
    moduleColorState.token === token
      ? moduleColorState.colors
      : DEFAULT_MODULE_COLORS;

  useEffect(() => {
    const handleSessionStorage = (event) => {
      if (
        event.key === "token" ||
        event.key === "tanioSession" ||
        event.key === null
      ) {
        refreshSession((current) => current + 1);
      }
    };

    window.addEventListener("storage", handleSessionStorage);

    return () => {
      window.removeEventListener("storage", handleSessionStorage);
    };
  }, []);

  useEffect(() => {
    const updateAppearance = () => {
      setAppearance(getStoredAppearance());
    };

    const handleStorageUpdate = (event) => {
      if (event.key === SETTINGS_KEY || event.key === null) {
        updateAppearance();
      }
    };

    window.addEventListener(
      "tanio-settings-updated",
      updateAppearance
    );
    window.addEventListener("storage", handleStorageUpdate);

    updateAppearance();

    return () => {
      window.removeEventListener(
        "tanio-settings-updated",
        updateAppearance
      );
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    if (!window.matchMedia) {
      return undefined;
    }

    const systemTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const updateSystemTheme = () => {
      setSystemIsDark(systemTheme.matches);
    };

    updateSystemTheme();
    systemTheme.addEventListener("change", updateSystemTheme);

    return () => {
      systemTheme.removeEventListener(
        "change",
        updateSystemTheme
      );
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute("data-tanio-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme;

    root.classList.toggle(
      "tanio-compact",
      appearance.compactLayout
    );
  }, [resolvedTheme, appearance.compactLayout]);

  useEffect(() => {
    const handleModulesUpdated = (event) => {
      const updatedModules = Array.isArray(event.detail)
        ? event.detail.filter((moduleId) =>
            VALID_MODULE_IDS.includes(moduleId)
          )
        : getStoredSelectedModules();

      setSelectedModules(updatedModules);
    };

    const handleStorageUpdate = (event) => {
      if (
        event.key === SELECTED_MODULES_KEY ||
        event.key === null
      ) {
        setSelectedModules(getStoredSelectedModules());
      }
    };

    window.addEventListener(
      "tanio-modules-updated",
      handleModulesUpdated
    );
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener(
        "tanio-modules-updated",
        handleModulesUpdated
      );
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isSignedIn || isSignInPage || !token) {
      setModuleColorState({
        token: null,
        userId: null,
        colors: { ...DEFAULT_MODULE_COLORS },
      });

      return undefined;
    }

    let active = true;
    let knownUserId = null;
    let requestVersion = 0;
    let controller = null;

    const sessionIsCurrent = () =>
      active &&
      localStorage.getItem("token") === token &&
      localStorage.getItem("tanioSession") === "true";

    const loadModuleColors = async () => {
      controller?.abort();
      controller = new AbortController();

      const requestController = controller;
      const version = ++requestVersion;

      try {
        const response = await fetch(
          `${API_URL}/auth/me/module-colors`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: requestController.signal,
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            typeof data?.detail === "string"
              ? data.detail
              : "Unable to load your module colors."
          );
        }

        const result = parseModuleColorResponse(data);

        if (
          !sessionIsCurrent() ||
          requestController.signal.aborted ||
          version !== requestVersion
        ) {
          return;
        }

        knownUserId = result.userId;

        setModuleColorState({
          token,
          userId: result.userId,
          colors: result.colors,
        });
      } catch (error) {
        if (
          sessionIsCurrent() &&
          !requestController.signal.aborted &&
          version === requestVersion
        ) {
          console.error("Module color loading failed:", error);
        }
      }
    };

    const handleModuleColorsUpdated = (event) => {
      if (!sessionIsCurrent()) {
        return;
      }

      try {
        const result = parseModuleColorResponse(event.detail);

        // Verify the account through the API if the initial load
        // has not identified the signed-in user yet.
        if (knownUserId === null) {
          loadModuleColors();
          return;
        }

        if (result.userId !== knownUserId) {
          return;
        }

        // A completed save takes precedence over an older GET.
        requestVersion += 1;
        controller?.abort();

        setModuleColorState({
          token,
          userId: result.userId,
          colors: result.colors,
        });
      } catch (error) {
        console.error("Invalid module color update:", error);
      }
    };

    window.addEventListener(
      "tanio-module-colors-updated",
      handleModuleColorsUpdated
    );

    loadModuleColors();

    return () => {
      active = false;
      controller?.abort();

      window.removeEventListener(
        "tanio-module-colors-updated",
        handleModuleColorsUpdated
      );
    };
  }, [isSignedIn, isSignInPage, token]);

  useEffect(() => {
    if (!isSignedIn || isSignInPage) {
      setShowInterestModal(false);
      return undefined;
    }

    setShowInterestModal(
      localStorage.getItem(INTEREST_PROMPT_KEY) === "true"
    );

    if (!token) {
      setShowInterestModal(false);
      return undefined;
    }

    const controller = new AbortController();

    const loadInterestSelection = async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/me/interests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load your module selections."
          );
        }

        const data = await response.json();

        if (
          controller.signal.aborted ||
          localStorage.getItem("token") !== token
        ) {
          return;
        }

        const savedModules = Array.isArray(data.selected_modules)
          ? data.selected_modules.filter((moduleId) =>
              VALID_MODULE_IDS.includes(moduleId)
            )
          : [];

        setSelectedModules(savedModules);

        localStorage.setItem(
          SELECTED_MODULES_KEY,
          JSON.stringify(savedModules)
        );

        setShowInterestModal(
          localStorage.getItem(INTEREST_PROMPT_KEY) === "true"
        );
      } catch (error) {
        if (
          !controller.signal.aborted &&
          localStorage.getItem("token") === token
        ) {
          console.error(error);
          setSelectedModules(getStoredSelectedModules());
        }
      }
    };

    loadInterestSelection();

    return () => {
      controller.abort();
    };
  }, [isSignedIn, isSignInPage, token]);

  useEffect(() => {
    if (!isSignedIn || isSignInPage || !token) {
      return undefined;
    }

    const controller = new AbortController();

    const sendHeartbeat = async () => {
      if (localStorage.getItem("token") !== token) {
        return;
      }

      try {
        await fetch(
          `${API_URL}/auth/presence/heartbeat`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Presence heartbeat failed:", error);
        }
      }
    };

    sendHeartbeat();

    const heartbeatInterval = window.setInterval(
      sendHeartbeat,
      2 * 60 * 1000
    );

    return () => {
      window.clearInterval(heartbeatInterval);
      controller.abort();
    };
  }, [isSignedIn, isSignInPage, token]);

  const handleDashboardModeChange = (mode) => {
    const nextMode = mode === "advanced" ? "advanced" : "basic";

    setDashboardMode(nextMode);
    localStorage.setItem(DASHBOARD_MODE_KEY, nextMode);
  };

  const handleInterestSelectionComplete = (savedModules) => {
    const validSavedModules = Array.isArray(savedModules)
      ? savedModules.filter((moduleId) =>
          VALID_MODULE_IDS.includes(moduleId)
        )
      : [];

    setSelectedModules(validSavedModules);

    localStorage.setItem(
      SELECTED_MODULES_KEY,
      JSON.stringify(validSavedModules)
    );

    localStorage.removeItem(INTEREST_PROMPT_KEY);
    setShowInterestModal(false);
  };

  const isModuleEnabled = (moduleId) =>
    selectedModules.includes(moduleId);

  if (!isSignedIn && !isSignInPage) {
    return <Navigate to="/signin" replace />;
  }

  if (isSignedIn && isSignInPage) {
    return <Navigate to="/" replace />;
  }

  if (isSignInPage) {
    return (
      <Routes>
        <Route path="/signin" element={<SignIn />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-950 text-white">
      <Sidebar
        dashboardMode={dashboardMode}
        selectedModules={selectedModules}
        theme={resolvedTheme}
        moduleColors={moduleColors}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <div className="flex min-w-0 flex-1 overflow-auto">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  dashboardMode={dashboardMode}
                  onDashboardModeChange={handleDashboardModeChange}
                  selectedModules={selectedModules}
                  moduleColors={moduleColors}
                  theme={resolvedTheme}
                />
              }
            />

            <Route
              path="/workspaces"
              element={<Workspaces />}
            />

            <Route
              path="/workspaces/:workspaceId"
              element={<Workspaces />}
            />

            <Route
              path="/projects"
              element={<Projects />}
            />

            <Route
              path="/projects/:projectId"
              element={<ProjectDetail />}
            />

            <Route
              path="/content"
              element={<Content />}
            />

            <Route
              path="/community"
              element={<Community />}
            />

            <Route
              path="/product-architect"
              element={
                isModuleEnabled("product-architect") ? (
                  <ProductArchitect />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/tabletop-creator"
              element={
                isModuleEnabled("tabletop-creator") ? (
                  <TabletopCreator />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/problem-solver"
              element={
                isModuleEnabled("problem-solver") ? (
                  <ProblemSolver />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/learning-studio"
              element={
                isModuleEnabled("learning-studio") ? (
                  <LearningStudio />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/help"
              element={<HelpGuide />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />
          </Routes>
        </div>
      </div>

      {showInterestModal && (
        <InterestSelectionModal
          onComplete={handleInterestSelectionComplete}
        />
      )}
    </div>
  );
}

export default App;