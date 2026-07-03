import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import Projects from "./pages/Projects";
import Content from "./pages/Content";
import Settings from "./pages/Settings";
import ProductArchitect from "./pages/ProductArchitect";

function App() {
  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <Sidebar />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workspaces" element={<Workspaces />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/content" element={<Content />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/product-architect" element={<ProductArchitect />} />
      </Routes>
    </div>
  );
}

export default App;