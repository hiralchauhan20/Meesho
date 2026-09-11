import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FaSun, FaMoon, FaStore } from "react-icons/fa";
import { API_URL } from "../config";

function Navbar({ toggleTheme, theme }) {
  const location = useLocation();
  const [shops, setShops] = useState([]);
  const [viewingShop, setViewingShop] = useState(() => {
    try {
      const stored = localStorage.getItem("currentViewingShop");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${API_URL}/api/shops`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setShops(data);
        }
      } catch (e) {
        console.error("Failed to load shops for navbar:", e);
      }
    };
    fetchShops();

    const handleShopChange = () => {
      try {
        const stored = localStorage.getItem("currentViewingShop");
        if (stored) {
          setViewingShop(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener("shopChange", handleShopChange);
    return () => window.removeEventListener("shopChange", handleShopChange);
  }, []);

  const getPageName = () => {
    switch (location.pathname) {
      case "/":
        return "Monthly Profit & Loss Statement";
      case "/accounts":
        return "Accounts Ledger";
      case "/investments":
        return "Investment & Bulk Purchase Ledger";
      default:
        return "Seller Manager";
    }
  };

  const getActiveStoreName = () => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const shopParam = searchParams.get("shop");

      // When on /accounts, display the active shop whose orders are being viewed
      if (location.pathname === "/accounts") {
        if (shopParam) {
          if (shopParam === "All") {
            return "All Shops";
          }
          const matched = shops.find(
            (s) => (s.shopName || "").toLowerCase() === shopParam.trim().toLowerCase()
          );
          const platform = matched?.platform ? ` - ${matched.platform}` : "";
          return `${shopParam}${platform}`;
        }

        if (viewingShop?.shopName) {
          if (viewingShop.shopName === "All") {
            return "All Shops";
          }
          const matched = shops.find(
            (s) => (s.shopName || "").toLowerCase() === viewingShop.shopName.trim().toLowerCase()
          );
          const platform = (matched?.platform || viewingShop.platform) ? ` - ${matched?.platform || viewingShop.platform}` : "";
          return `${viewingShop.shopName}${platform}`;
        }
      }

      // Default shop if set
      const defaultShop = shops.find(s => s.isDefault);
      if (defaultShop) {
        const platform = defaultShop.platform ? ` - ${defaultShop.platform}` : "";
        return `${defaultShop.shopName}${platform}`;
      }

      // User store fallback
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const platform = user.platform ? ` - ${user.platform}` : " - Meesho";
        return `${user.name || "HKC Collection"}${platform}`;
      }
    } catch (e) {
      console.error(e);
    }
    return "HKC Collection - Meesho";
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
