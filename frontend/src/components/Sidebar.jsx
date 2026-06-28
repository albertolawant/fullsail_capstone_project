import logo from "../assets/cropped_logo.png";
import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaFolder,
  FaProjectDiagram,
  FaRobot,
  FaCog,
} from "react-icons/fa";

function Sidebar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive
        ? "bg-slate-800 text-cyan-400"
        : "text-white hover:bg-slate-800 hover:text-cyan-400"
    }`;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">

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
      </nav>

    </aside>
  );
}

export default Sidebar;