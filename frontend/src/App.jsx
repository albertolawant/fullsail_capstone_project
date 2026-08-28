import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import SignIn from "./pages/SignIn";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Projects from "./pages/Projects";
import Content from "./pages/Content";
import Settings from "./pages/Settings";
import ProductArchitect from "./pages/ProductArchitect";
import TabletopCreator from "./pages/TabletopCreator";
import HelpGuide from "./pages/HelpGuide";

const SETTINGS_KEY = "tanioSettings";

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

function App() {
  const location = useLocation();

  const [appearance, setAppearance] = useState(
    getStoredAppearance
  );

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

      window.removeEventListener(
        "storage",
        updateAppearance
      );
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute("data-tanio-theme", appearance.theme);

    if (appearance.compactLayout) {
      root.classList.add("tanio-compact");
    } else {
      root.classList.remove("tanio-compact");
    }
  }, [appearance]);

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
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <div className="flex flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route
              path="/workspaces"
              element={<Workspaces />}
            />

            <Route
              path="/projects"
              element={<Projects />}
            />

            <Route
              path="/content"
              element={<Content />}
            />

            <Route
              path="/product-architect"
              element={<ProductArchitect />}
            />

            <Route
              path="/tabletop-creator"
              element={<TabletopCreator />}
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
    </div>
  );
}

export default App;