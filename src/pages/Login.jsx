import { useState } from "react";
import { FaStore, FaEnvelope, FaLock, FaUserPlus, FaSignInAlt, FaBoxOpen } from "react-icons/fa";

// Helper: get saved emails list from localStorage
const getSavedEmails = () => {
  try {
    return JSON.parse(localStorage.getItem("savedEmails") || "[]");
  } catch {
    return [];
  }
};

// Helper: save a new email to the list (no duplicates)
const saveEmailToList = (emailVal) => {
  const lower = emailVal.trim().toLowerCase();
  if (!lower) return;
  const existing = getSavedEmails();
  if (!existing.includes(lower)) {
    existing.unshift(lower); // newest first
    localStorage.setItem("savedEmails", JSON.stringify(existing));
  }
};

function Login({ setToken }) {
  const [isRegister, setIsRegister] = useState(false);
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem("rememberedEmail") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedEmails] = useState(() => getSavedEmails());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/users/register" : "/api/users/login";
      const payload = isRegister 
        ? { name: shopName.trim(), email: email.trim().toLowerCase(), password }
        : { email: email.trim().toLowerCase(), password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }

      // Store email to remember it next time + save to suggestions list
      localStorage.setItem("rememberedEmail", email.trim().toLowerCase());
      saveEmailToList(email);

      if (isRegister) {
        // Switch to login after successful registration
        alert("Shop registered successfully! Please login with your details.");
        setIsRegister(false);
        setShopName("");
        setPassword("");
      } else {
        // Save session details
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      background: "radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent), var(--bg-primary)",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "var(--glass-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "36px",
        boxShadow: "var(--glass-shadow)",
        backdropFilter: "blur(16px)"
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            justifyContent: "center", 
            width: "50px", 
            height: "50px", 
            background: "rgba(99, 102, 241, 0.1)", 
            borderRadius: "12px", 
            marginBottom: "12px",
            color: "var(--primary)"
          }}>
            <FaBoxOpen style={{ fontSize: "24px" }} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>
            Meesho<span style={{ color: "var(--primary)" }}>Manager</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "6px" }}>
            {isRegister ? "Register your new Meesho shop" : "Log in to manage your shop accounts"}
          </p>
        </div>

        {error && (
          <div style={{
            padding: "12px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "var(--danger)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "20px",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                Shop Name / Account Name
              </label>
              <div style={{ position: "relative" }}>
                <FaStore style={{ position: "absolute", left: "14px", top: "15px", color: "var(--text-muted)", fontSize: "14px" }} />
                <input 
                  type="text" 
                  placeholder="e.g. HKC Collection" 
                  value={shopName} 
                  onChange={(e) => setShopName(e.target.value)} 
                  required 
                  style={{ width: "100%", paddingLeft: "42px", height: "46px" }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <FaEnvelope style={{ position: "absolute", left: "14px", top: "15px", color: "var(--text-muted)", fontSize: "14px" }} />
              <input 
                type="email" 
                placeholder="seller@meesho.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                list="saved-emails-list"
                autoComplete="email"
                style={{ width: "100%", paddingLeft: "42px", height: "46px" }}
              />
              <datalist id="saved-emails-list">
                {savedEmails.map((em) => (
                  <option key={em} value={em} />
                ))}
              </datalist>
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <FaLock style={{ position: "absolute", left: "14px", top: "15px", color: "var(--text-muted)", fontSize: "14px" }} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: "100%", paddingLeft: "42px", height: "46px" }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ 
              width: "100%", 
              height: "46px", 
              borderRadius: "8px", 
              fontSize: "14px", 
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "linear-gradient(135deg, var(--primary), var(--primary-hover))"
            }}
          >
            {loading ? "Please wait..." : isRegister ? (
              <>
                <FaUserPlus /> Register Shop
              </>
            ) : (
              <>
                <FaSignInAlt /> Log In
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--text-secondary)" }}>
          {isRegister ? "Already registered?" : "New Meesho shop account?"}{" "}
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={{ 
              background: "none", 
              border: "none", 
              color: "var(--primary)", 
              fontWeight: "600", 
              cursor: "pointer",
              padding: "0"
            }}
          >
            {isRegister ? "Log In Here" : "Register Shop Here"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
