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

function App() {

  const location = useLocation();

  const isSignInPage = location.pathname === "/signin";
  const isSignedIn = localStorage.getItem("tanioSession") === "true";

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
    <div className="flex h-screen bg-slate-950 text-white">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />

        <div className="flex flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/content" element={<Content />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/product-architect"
              element={<ProductArchitect />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;