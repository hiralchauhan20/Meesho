import { useLocation } from "react-router-dom";
import { FaSun, FaMoon, FaStore } from "react-icons/fa";

function Navbar({ toggleTheme, theme }) {
  const location = useLocation();

  const getPageName = () => {
    switch (location.pathname) {
      case "/":
        return "Accounts";
      case "/reports":
        return "Monthly Profit & Loss Statement";
      default:
        return "Meesho Manager";
    }
  };

  const getActiveStoreName = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.name || "HKC Collection";
      }
    } catch (e) {
      console.error(e);
    }
    return "HKC Collection";
  };

  return (
    <div className="navbar">
      <div className="navbar-brand">
        <h1>{getPageName()}</h1>
      </div>

      <div className="navbar-actions">
        <div className="navbar-user" style={{ marginRight: "10px", color: "var(--text-secondary)", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaStore style={{ color: "var(--primary)" }} />
          <span>Store Name: {getActiveStoreName()}</span>
        </div>

        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border-color)", margin: "0 10px" }}></div>

        <button 
          onClick={toggleTheme} 
          style={{ 
            background: "none", 
            border: "none", 
            color: "var(--text-primary)", 
            cursor: "pointer", 
            fontSize: "18px",
            display: "flex",
            alignItems: "center"
          }}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <FaSun style={{ color: "#fbbf24" }} /> : <FaMoon style={{ color: "#312e81" }} />}
        </button>
      </div>
    </div>
  );
}

export default Navbar;
