import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Ledger from "./pages/Ledger";
import Reports from "./pages/Reports";
import Login from "./pages/Login";

import "./App.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
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
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
