import { Link, useLocation } from "react-router-dom";
import { FaTable, FaChartBar, FaBoxOpen, FaSignOutAlt, FaBriefcase, FaBullhorn, FaFileInvoice, FaBoxes, FaStore, FaChevronLeft } from "react-icons/fa";

function Sidebar({ isOpen, onClose, onLogout }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 992 && onClose) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", padding: "0 4px" }}>
        <h2 style={{ margin: 0, padding: 0, fontSize: "19px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
          <FaBoxOpen style={{ color: "var(--primary)" }} /> 
          Seller<span>Manager</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="sidebar-collapse-btn"
          title="Collapse Sidebar / સાઈડબાર સંકોચો"
          aria-label="Collapse Sidebar"
        >
          <FaChevronLeft style={{ fontSize: "12px" }} />
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto" }}>
        <Link to="/" className={isActive("/")} onClick={handleNavClick}>
          <FaChartBar /> Monthly P&L
        </Link>

        <Link to="/accounts" className={isActive("/accounts")} onClick={handleNavClick}>
          <FaTable /> Accounts
        </Link>

        <Link to="/shops" className={isActive("/shops")} onClick={handleNavClick}>
          <FaStore /> Manage Shops
        </Link>

        <Link to="/products" className={isActive("/products")} onClick={handleNavClick}>
          <FaBoxes /> Products
        </Link>

        <Link to="/investments" className={isActive("/investments")} onClick={handleNavClick}>
          <FaBriefcase /> Investments
        </Link>

        <Link to="/ads" className={isActive("/ads")} onClick={handleNavClick}>
          <FaBullhorn /> Platform Ads
        </Link>

        <Link to="/claims" className={isActive("/claims")} onClick={handleNavClick}>
          <FaFileInvoice /> Platform Claims
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
          <FaSignOutAlt /> Sign Out Account
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
