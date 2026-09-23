import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import InterestSelectionModal from "./components/InterestSelectionModal";

import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Content from "./pages/Content";
import Settings from "./pages/Settings";
import ProductArchitect from "./pages/ProductArchitect";
import TabletopCreator from "./pages/TabletopCreator";
import ProblemSolver from "./pages/ProblemSolver";
import HelpGuide from "./pages/HelpGuide";

const SETTINGS_KEY = "tanioSettings";
const DASHBOARD_MODE_KEY = "tanioDashboardMode";
const INTEREST_PROMPT_KEY = "tanioInterestPromptPending";
const SELECTED_MODULES_KEY = "tanioSelectedModules";

const VALID_MODULE_IDS = [
  "product-architect",
  "tabletop-creator",
  "problem-solver",
];

function getStoredAppearance() {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);

    if (!storedSettings) {
      return {
        theme: "dark",
        compactLayout: false,
      };
    }

    const parsedSettings = JSON.parse(storedSettings);

    return {
      theme: parsedSettings?.appearance?.theme || "dark",
      compactLayout:
        parsedSettings?.appearance?.compactLayout || false,
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

    if (!Array.isArray(storedModules)) {
      return [];
    }

    return storedModules.filter((moduleId) =>
      VALID_MODULE_IDS.includes(moduleId)
    );
  } catch {
    return [];
  }
}

function App() {
  const location = useLocation();

  const [appearance, setAppearance] = useState(
    getStoredAppearance
  );

  const [dashboardMode, setDashboardMode] = useState(
    getStoredDashboardMode
  );

  const [selectedModules, setSelectedModules] = useState(
    getStoredSelectedModules
  );

  const [showInterestModal, setShowInterestModal] =
    useState(false);

  const isSignInPage = location.pathname === "/signin";

  const isSignedIn =
    localStorage.getItem("tanioSession") === "true";

  useEffect(() => {
    const updateAppearance = () => {
      setAppearance(getStoredAppearance());
    };

    window.addEventListener(
      "tanio-settings-updated",
      updateAppearance
    );

    window.addEventListener("storage", updateAppearance);

    return () => {
      window.removeEventListener(
        "tanio-settings-updated",
        updateAppearance
      );

      window.removeEventListener("storage", updateAppearance);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute(
      "data-tanio-theme",
      appearance.theme
    );

    if (appearance.compactLayout) {
      root.classList.add("tanio-compact");
    } else {
      root.classList.remove("tanio-compact");
    }
  }, [appearance]);

  useEffect(() => {
    if (!isSignedIn || isSignInPage) {
      setShowInterestModal(false);
      return;
    }

    setSelectedModules(getStoredSelectedModules());

    const shouldShowInterestModal =
      localStorage.getItem(INTEREST_PROMPT_KEY) === "true";

    setShowInterestModal(shouldShowInterestModal);
  }, [isSignedIn, isSignInPage, location.pathname]);

  const handleDashboardModeChange = (mode) => {
    setDashboardMode(mode);
    localStorage.setItem(DASHBOARD_MODE_KEY, mode);
  };

  const handleInterestSelectionComplete = (savedModules) => {
    setSelectedModules(savedModules);
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
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar
        dashboardMode={dashboardMode}
        selectedModules={selectedModules}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <div className="flex flex-1 overflow-auto">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  dashboardMode={dashboardMode}
                  onDashboardModeChange={
                    handleDashboardModeChange
                  }
                  selectedModules={selectedModules}
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