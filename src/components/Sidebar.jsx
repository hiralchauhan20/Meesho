import { Link, useLocation } from "react-router-dom";
import { FaTable, FaChartBar, FaBoxOpen, FaSignOutAlt } from "react-icons/fa";

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
          <FaTable /> Accounts
        </Link>

        <Link to="/reports" className={isActive("/reports")}>
          <FaChartBar /> Monthly P&L
        </Link>
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
