import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Ledger from "./pages/Ledger";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Investment from "./pages/Investment";
import MeeshoAds from "./pages/MeeshoAds";
import Claims from "./pages/Claims";

import "./App.css";

function App() {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("token") || "";
    if (savedToken) {
      try {
        const parts = savedToken.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp && Date.now() >= payload.exp * 1000) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            return "";
          }
        }
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return "";
      }
    }
    return savedToken;
  });
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  useEffect(() => {
    // Apply theme
    if (theme === "light") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
  };

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401) {
        handleLogout();
      }
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // If not authenticated, render Login/Register page
  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <div className="app">
      <Sidebar onLogout={handleLogout} />

      <div className="content">
        <Navbar toggleTheme={toggleTheme} theme={theme} />
        
        <div className="main-body animate-fade">
          <Routes>
            <Route path="/" element={<Reports />} />
            <Route path="/accounts" element={<Ledger />} />
            <Route path="/investments" element={<Investment />} />
            <Route path="/ads" element={<MeeshoAds />} />
            <Route path="/claims" element={<Claims />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
