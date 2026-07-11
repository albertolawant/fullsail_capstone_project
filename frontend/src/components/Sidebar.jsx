import logo from "../assets/cropped_logo.png";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaFolder,
  FaProjectDiagram,
  FaRobot,
  FaCog,
  FaBrain,
  FaSignOutAlt,
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive
        ? "bg-slate-800 text-cyan-400"
        : "text-white hover:bg-slate-800 hover:text-cyan-400"
    }`;

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await fetch("http://127.0.0.1:8000/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("tanioSession");
      localStorage.removeItem("tanioUser");

      navigate("/signin", { replace: true });
    }
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="flex justify-center items-center border-b border-slate-800 h-24 overflow-hidden">
        <img
          src={logo}
          alt="Tanio AI"
          className="w-56 h-auto block select-none"
          draggable={false}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/" end className={linkClass}>
          <FaHome />
          Dashboard
        </NavLink>

        <NavLink to="/workspaces" className={linkClass}>
          <FaFolder />
          Workspaces
        </NavLink>

        <NavLink to="/projects" className={linkClass}>
          <FaProjectDiagram />
          Projects
        </NavLink>

        <NavLink to="/content" className={linkClass}>
          <FaRobot />
          Content
        </NavLink>

        <NavLink to="/settings" className={linkClass}>
          <FaCog />
          Settings
        </NavLink>

        <NavLink to="/product-architect" className={linkClass}>
          <FaBrain />
          Product Architect
        </NavLink>
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-800 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white transition-all duration-200 hover:bg-slate-800 hover:text-red-400"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;