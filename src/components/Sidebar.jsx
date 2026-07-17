import { Link, useLocation } from "react-router-dom";
import { FaTable, FaChartBar, FaBoxOpen, FaSignOutAlt, FaBriefcase, FaGithub, FaExternalLinkAlt } from "react-icons/fa";

function Sidebar({ onLogout }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <div className="sidebar" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h2>
        <FaBoxOpen style={{ color: "var(--primary)" }} /> 
        Meesho<span>Manager</span>
      </h2>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
        <Link to="/" className={isActive("/")}>
          <FaChartBar /> Monthly P&L
        </Link>

        <Link to="/accounts" className={isActive("/accounts")}>
          <FaTable /> Accounts
        </Link>

        <Link to="/investments" className={isActive("/investments")}>
          <FaBriefcase /> Investments
        </Link>

        <div style={{ borderTop: "1px solid var(--border-color)", margin: "16px 0 10px 0" }}></div>
        <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)", padding: "0 16px 8px 16px", letterSpacing: "0.5px" }}>Links</div>

        <a href="https://github.com/hiralchauhan20/Meesho" target="_blank" rel="noopener noreferrer">
          <FaGithub /> GitHub Repo
        </a>

        <a href="https://meesho-manager.onrender.com" target="_blank" rel="noopener noreferrer">
          <FaExternalLinkAlt /> Render Deploy
        </a>
      </div>

      {/* Sidebar Footer with Logout action */}
      <div className="sidebar-footer" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "auto" }}>
        <button 
          onClick={onLogout}
          style={{
            width: "100%",
            background: "rgba(239, 68, 68, 0.05)",
            border: "1px solid rgba(239, 68, 68, 0.1)",
            color: "rgba(239, 68, 68, 0.8)",
            padding: "10px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: "600",
            transition: "all var(--transition-fast)"
          }}
          className="logout-btn-hover"
        >
          <FaSignOutAlt /> Sign Out Shop
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
