import { useState, useEffect, useMemo } from "react";
import { 
  FaPlus, 
  FaTrash, 
  FaEdit, 
  FaCalendarAlt, 
  FaSearch, 
  FaTimes, 
  FaBullhorn, 
  FaCoins, 
  FaChartLine, 
  FaCalculator,
  FaStore,
  FaTag
} from "react-icons/fa";
import ConfirmModal from "../components/ConfirmModal";
import { API_URL } from "../config";
import { getPlatformStyle } from "./Shops";

function MeeshoAds() {
  const [ads, setAds] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter states
  const [searchText, setSearchText] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState(""); // YYYY-MM
  const [filterShop, setFilterShop] = useState("All");

  // Add Form States
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // Default today
  const [selectedShop, setSelectedShop] = useState("HKC Collection");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit Modal States
  const [editingAd, setEditingAd] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editShopName, setEditShopName] = useState("HKC Collection");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Custom Modal States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("Alert");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message, title = "Notice") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  // Fetch ads, orders, and shops on mount
  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const [resExp, resOrders, resShops] = await Promise.all([
        fetch(`${API_URL}/api/expenses`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/shops`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!resExp.ok) throw new Error("Failed to fetch ads logs");
      const data = await resExp.json();
      const advertisingExpenses = data.filter(exp => exp.category === "Advertising");
      setAds(advertisingExpenses);

      if (resOrders.ok) {
        const dataOrders = await resOrders.json();
        setOrders(dataOrders);
      }

      if (resShops.ok) {
        const dataShops = await resShops.json();
        setShops(dataShops);
        const def = dataShops.find(s => s.isDefault) || dataShops[0];
        if (def) {
          setSelectedShop(prev => prev || def.shopName);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit new ads spend log
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showAlert("Please enter a valid ads amount.", "Validation Error");
      return;
    }

    const matchedShop = shops.find(s => s.shopName === selectedShop);
    const platform = matchedShop?.platform || "Meesho";

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/expenses/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: "Platform Ads",
          category: "Advertising",
          shopName: selectedShop,
          platform: platform,
          amount: Number(amount),
          date: new Date(date).toISOString(),
          note: note.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to log ads spend");
      
      // Reset form (keep date and shop as selected for quick entry of successive days)
      setAmount("");
      setNote("");
      
      // Refresh list
      await fetchAds();
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setSaving(false);
    }
  };

  // Open edit modal
  const startEdit = (ad) => {
    setEditingAd(ad);
    setEditDate(new Date(ad.date || ad.createdAt).toISOString().slice(0, 10));
    setEditShopName(ad.shopName || "HKC Collection");
    setEditAmount(ad.amount.toString());
    setEditNote(ad.note || "");
  };

  // Submit edited log
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editAmount || Number(editAmount) <= 0) {
      showAlert("Please enter a valid ads amount.", "Validation Error");
      return;
    }

    const matchedShop = shops.find(s => s.shopName === editShopName);
    const platform = matchedShop?.platform || "Meesho";

    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/expenses/${editingAd._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: "Platform Ads",
          category: "Advertising",
          shopName: editShopName,
          platform: platform,
          amount: Number(editAmount),
          date: new Date(editDate).toISOString(),
          note: editNote.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to update ads log");
      setEditingAd(null);
      await fetchAds();
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setUpdating(false);
    }
  };

  // Delete ads log
  const handleDelete = (id) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false);
    if (!deleteId) return;

    try {
      const res = await fetch(`${API_URL}/api/expenses/${deleteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete ads entry");
      await fetchAds();
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setDeleteId(null);
    }
  };

  // ── Stats and Aggregations ──────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed

    const prevMonthDate = new Date(curYear, curMonth - 1, 1);
    const lastMonthYear = prevMonthDate.getFullYear();
    const lastMonth = prevMonthDate.getMonth();

    let totalThisMonth = 0;
    let loggedDaysThisMonth = new Set();
    let entriesCountThisMonth = 0;
    let totalLastMonth = 0;
    let totalAllTime = 0;

    const monthlyBreakdownMap = {};

    ads.forEach((ad) => {
      // If shop filter is selected, filter ads stats accordingly
      if (filterShop && filterShop !== "All") {
        const adShop = (ad.shopName || "HKC Collection").trim().toLowerCase();
        if (adShop !== filterShop.trim().toLowerCase()) return;
      }

      const d = new Date(ad.date || ad.createdAt);
      const amountVal = ad.amount || 0;
      const adShopName = (ad.shopName || "HKC Collection").trim().toLowerCase();

      // Try to parse order count from note first, otherwise fall back to database orders on that day for that shop
      const noteMatch = ad.note && ad.note.match(/(\d+)\s*order/i);
      let entryOrders = 0;
      if (noteMatch) {
        entryOrders = parseInt(noteMatch[1], 10);
      } else {
        const dateStr = d.toISOString().slice(0, 10);
        entryOrders = orders.filter(o => {
          if (o.paymentStatus === "Cancel") return false;
          const oDate = new Date(o.date || o.createdAt).toISOString().slice(0, 10);
          const oShop = (o.shopName || "HKC Collection").trim().toLowerCase();
          return oDate === dateStr && oShop === adShopName;
        }).length;
      }

      // Cumulative stats
      totalAllTime += amountVal;

      if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
        totalThisMonth += amountVal;
        // Keep track of unique dates logged this month
        loggedDaysThisMonth.add(d.toDateString());
        entriesCountThisMonth += 1;
      } else if (d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth) {
        totalLastMonth += amountVal;
      }

      // Group by Month/Year for breakdown list
      const monthKey = d.toLocaleString("en-US", { month: "long", year: "numeric" }); // e.g. "July 2026"
      if (!monthlyBreakdownMap[monthKey]) {
        monthlyBreakdownMap[monthKey] = {
          monthStr: monthKey,
          total: 0,
          entries: 0,
          ordersCountSum: 0
        };
      }
      monthlyBreakdownMap[monthKey].total += amountVal;
      monthlyBreakdownMap[monthKey].entries += 1;
      monthlyBreakdownMap[monthKey].ordersCountSum += entryOrders;
    });

    const avgDailyThisMonth = entriesCountThisMonth > 0 
      ? totalThisMonth / entriesCountThisMonth 
      : 0;

    // Convert breakdown map to sorted list
    const monthlyList = Object.values(monthlyBreakdownMap).sort((a, b) => {
      return new Date(b.monthStr) - new Date(a.monthStr);
    }).map(m => {
      const totalMonthOrders = m.ordersCountSum;

      return {
        ...m,
        ordersCount: totalMonthOrders,
        avg: totalMonthOrders > 0 ? m.total / totalMonthOrders : 0
      };
    });

    return {
      totalThisMonth,
      avgDailyThisMonth,
      totalLastMonth,
      totalAllTime,
      monthlyList,
      monthlyBreakdownMap
    };
  }, [ads, orders, filterShop]);

  // Shop-wise Breakdown list
  const shopBreakdownList = useMemo(() => {
    const map = {};
    shops.forEach(s => {
      map[s.shopName] = {
        shopName: s.shopName,
        platform: s.platform,
        totalAllTime: 0,
        totalThisMonth: 0,
        entriesCount: 0
      };
    });

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    ads.forEach(ad => {
      const sName = ad.shopName || "HKC Collection";
      const sPlatform = ad.platform || (shops.find(s => s.shopName === sName)?.platform) || "Meesho";
      if (!map[sName]) {
        map[sName] = {
          shopName: sName,
          platform: sPlatform,
          totalAllTime: 0,
          totalThisMonth: 0,
          entriesCount: 0
        };
      }
      map[sName].totalAllTime += (ad.amount || 0);
      map[sName].entriesCount += 1;
      const d = new Date(ad.date || ad.createdAt);
      if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
        map[sName].totalThisMonth += (ad.amount || 0);
      }
    });

    return Object.values(map);
  }, [ads, shops]);

  const handleMonthClick = (monthStr) => {
    const d = new Date(monthStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const formatted = `${y}-${m}`;
    if (filterMonthYear === formatted) {
      setFilterMonthYear("");
    } else {
      setFilterMonthYear(formatted);
    }
  };

  // ── Filters & Search ────────────────────────────────────────────────
  const filteredAds = useMemo(() => {
    return ads
      .filter((ad) => {
        // Shop filter
        if (filterShop && filterShop !== "All") {
          const adShop = (ad.shopName || "HKC Collection").trim().toLowerCase();
          if (adShop !== filterShop.trim().toLowerCase()) return false;
        }

        // Date match
        const adDate = new Date(ad.date || ad.createdAt);
        if (filterMonthYear) {
          const [fYear, fMonth] = filterMonthYear.split("-");
          if (adDate.getFullYear() !== Number(fYear) || (adDate.getMonth() + 1) !== Number(fMonth)) {
            return false;
          }
        }

        // Search text match (checks notes, title, and shopName)
        if (searchText.trim()) {
          const query = searchText.toLowerCase();
          const noteText = (ad.note || "").toLowerCase();
          const titleText = (ad.title || "").toLowerCase();
          const shopText = (ad.shopName || "").toLowerCase();
          return noteText.includes(query) || titleText.includes(query) || shopText.includes(query);
        }

        return true;
      })
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)); // Newest first
  }, [ads, filterShop, filterMonthYear, searchText]);

  return (
    <div className="container" style={{ paddingBottom: "40px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <FaBullhorn style={{ color: "var(--primary)" }} /> Platform Ads Manager
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Track and analyze your daily promotion expenses across all shop accounts
          </p>
        </div>

        {filterShop !== "All" && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--primary)"
          }}>
            <FaStore /> Filtered by: <strong>{filterShop}</strong>
            <button 
              onClick={() => setFilterShop("All")}
              style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", marginLeft: "4px" }}
              title="Reset Shop Filter"
            >
              <FaTimes />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: "var(--danger-bg)",
          border: "1px solid var(--danger-border)",
          color: "var(--danger)",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <div className="stat-card" style={{ "--card-accent": "var(--primary)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">This Month's Ads</span>
            <div className="stat-card-icon"><FaCoins /></div>
          </div>
          <div className="stat-card-value">₹{stats.totalThisMonth.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {filterShop === "All" ? "Total for current month (All Shops)" : `Current month for ${filterShop}`}
          </div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--info)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Daily Average</span>
            <div className="stat-card-icon"><FaCalculator /></div>
          </div>
          <div className="stat-card-value">₹{stats.avgDailyThisMonth.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Spent per logged day entry</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--warning)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Last Month's Ads</span>
            <div className="stat-card-icon"><FaChartLine /></div>
          </div>
          <div className="stat-card-value">₹{stats.totalLastMonth.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total for previous month</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--success)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">All-Time Ads Cost</span>
            <div className="stat-card-icon"><FaCoins /></div>
          </div>
          <div className="stat-card-value">₹{stats.totalAllTime.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Grand total of all logged ads</div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px" }}>
        
        {/* Left Column: Log Entry Form, Shop Ads Summary & Monthly Summary (5 cols) */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Quick Entry Form */}
          <form 
            onSubmit={handleSubmit}
            style={{ 
              background: "var(--glass-bg)", 
              backdropFilter: "blur(12px)", 
              borderRadius: "12px", 
              border: "1px solid var(--border-color)", 
              padding: "24px",
              boxShadow: "var(--glass-shadow)"
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)" }}>
              <FaPlus style={{ fontSize: "14px" }} /> Log Daily Ads Expense
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Select Shop / Account */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "var(--text-primary)" }}>
                  Select Shop / Account
                </label>
                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  required
                  style={{ width: "100%", height: "38px", fontSize: "13px" }}
                >
                  {shops.map(s => (
                    <option key={s._id} value={s.shopName}>
                      {s.shopName} ({s.platform || "Meesho"})
                    </option>
                  ))}
                  {shops.length === 0 && (
                    <option value="HKC Collection">HKC Collection (Meesho)</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "var(--text-primary)" }}>Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  max={new Date().toISOString().slice(0, 10)}
                  required 
                  style={{ width: "100%", height: "38px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "var(--text-primary)" }}>Ads Spend Amount (₹)</label>
                <input 
                  type="number" 
                  placeholder="Enter amount in ₹"
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  required 
                  min="0.01"
                  step="0.01"
                  style={{ width: "100%", height: "38px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "var(--text-primary)" }}>Note / Campaign Name (Optional)</label>
                <textarea 
                  placeholder="e.g. Daily Promo Ads or 15 Orders"
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  rows="3"
                  style={{ width: "100%", padding: "10px", borderRadius: "var(--border-radius-sm)", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontSize: "13px" }}
                />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="btn btn-primary"
                style={{ width: "100%", height: "40px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              >
                <FaPlus /> {saving ? "Saving Log..." : "Log Ads Spend"}
              </button>
            </div>
          </form>

          {/* Shop-wise Ads Spend Summary */}
          <div 
            style={{ 
              background: "var(--glass-bg)", 
              backdropFilter: "blur(12px)", 
              borderRadius: "12px", 
              border: "1px solid var(--border-color)", 
              padding: "24px",
              boxShadow: "var(--glass-shadow)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaStore style={{ color: "var(--primary)" }} /> Shop-wise Ads Total
              </h3>
              {filterShop !== "All" && (
                <button 
                  onClick={() => setFilterShop("All")}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                >
                  Show All
                </button>
              )}
            </div>
            
            {shopBreakdownList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)", fontSize: "13px" }}>
                No shop ads data logged yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {shopBreakdownList.map((s, index) => {
                  const pStyle = getPlatformStyle(s.platform);
                  const isCurrentFilter = filterShop === s.shopName;
                  
                  return (
                    <div 
                      key={index}
                      onClick={() => setFilterShop(prev => prev === s.shopName ? "All" : s.shopName)}
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        padding: "12px 16px", 
                        background: isCurrentFilter ? "rgba(99, 102, 241, 0.15)" : "var(--bg-primary)", 
                        border: isCurrentFilter ? "1px solid var(--primary)" : "1px solid var(--border-color)", 
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)"
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentFilter) e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentFilter) e.currentTarget.style.background = "var(--bg-primary)";
                      }}
                      title="Click to filter by this shop"
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>
                            {s.shopName}
                          </span>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: pStyle.bg,
                            color: pStyle.color,
                            border: `1px solid ${pStyle.border}`
                          }}>
                            {s.platform || "Meesho"}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
                          {s.entriesCount} entries • This Month: ₹{s.totalThisMonth.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: "var(--danger)" }}>
                          ₹{s.totalAllTime.toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Total Spent</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Month-wise Aggregation Breakdown */}
          <div 
            style={{ 
              background: "var(--glass-bg)", 
              backdropFilter: "blur(12px)", 
              borderRadius: "12px", 
              border: "1px solid var(--border-color)", 
              padding: "24px",
              boxShadow: "var(--glass-shadow)"
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
              Monthly Ads Summary
            </h3>
            
            {stats.monthlyList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
                No monthly data aggregated yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {stats.monthlyList.map((m, index) => {
                  const d = new Date(m.monthStr);
                  const y = d.getFullYear();
                  const mNum = String(d.getMonth() + 1).padStart(2, '0');
                  const isCurrentFilter = filterMonthYear === `${y}-${mNum}`;
                  
                  return (
                    <div 
                      key={index}
                      onClick={() => handleMonthClick(m.monthStr)}
                      style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        padding: "12px 16px", 
                        background: isCurrentFilter ? "rgba(99, 102, 241, 0.15)" : "var(--bg-primary)", 
                        border: isCurrentFilter ? "1px solid var(--primary)" : "1px solid var(--border-color)", 
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)"
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentFilter) e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentFilter) e.currentTarget.style.background = "var(--bg-primary)";
                      }}
                    >
                      <span style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>
                        {m.monthStr}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--primary)" }}>
                          ₹{m.total.toLocaleString("en-IN")}
                        </span>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {m.entries} entries • Orders: {m.ordersCount} • Avg: ₹{m.avg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}/order
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Daily Log Table (7 cols) */}
        <div style={{ gridColumn: "span 7" }}>
          
          {/* Table Container */}
          <div 
            style={{ 
              background: "var(--glass-bg)", 
              backdropFilter: "blur(12px)", 
              borderRadius: "12px", 
              border: "1px solid var(--border-color)", 
              padding: "24px",
              boxShadow: "var(--glass-shadow)",
              height: "100%",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
              Daily Ads Spend Log
            </h3>

            {/* Filter Bar */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
              {/* Shop Filter */}
              <div>
                <select
                  value={filterShop}
                  onChange={(e) => setFilterShop(e.target.value)}
                  style={{ height: "38px", fontSize: "13px", minWidth: "140px", padding: "0 12px" }}
                  title="Filter by Shop"
                >
                  <option value="All">All Shops</option>
                  {shops.map(s => (
                    <option key={s._id} value={s.shopName}>
                      {s.shopName} ({s.platform || "Meesho"})
                    </option>
                  ))}
                  {Array.from(new Set(ads.map(a => a.shopName || "HKC Collection")))
                    .filter(name => !shops.some(s => s.shopName === name))
                    .map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Text Search */}
              <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
                <FaSearch style={{ position: "absolute", left: "12px", top: "13px", color: "var(--text-muted)", fontSize: "12px" }} />
                <input 
                  type="text" 
                  placeholder="Search campaigns, shops or notes..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: "100%", paddingLeft: "34px", height: "38px", fontSize: "13px" }}
                />
              </div>

              {/* Month Filter */}
              <div>
                <input 
                  type="month" 
                  value={filterMonthYear}
                  onChange={(e) => setFilterMonthYear(e.target.value)}
                  style={{ height: "38px", fontSize: "13px", width: "140px", padding: "0 10px" }}
                  title="Filter by Month"
                />
              </div>

              {/* Clear filters */}
              {(searchText || filterMonthYear || filterShop !== "All") && (
                <button 
                  onClick={() => { setSearchText(""); setFilterMonthYear(""); setFilterShop("All"); }}
                  style={{ 
                    background: "none", 
                    border: "none", 
                    color: "var(--primary)", 
                    fontSize: "13px", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "4px", 
                    cursor: "pointer", 
                    fontWeight: "600" 
                  }}
                >
                  <FaTimes /> Clear
                </button>
              )}
            </div>

            {/* Table / List */}
            {loading ? (
              <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center", padding: "40px", color: "var(--text-secondary)" }}>
                Loading ads history...
              </div>
            ) : filteredAds.length === 0 ? (
              <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>
                No ads logged for the selected criteria.
              </div>
            ) : (
              <div style={{ flex: 1, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Date</th>
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Shop Account</th>
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Spend (₹)</th>
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Spend / Order (₹)</th>
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Note</th>
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAds.map((ad) => {
                      const adDate = new Date(ad.date || ad.createdAt);
                      const dateStr = adDate.toISOString().slice(0, 10);
                      const adShopName = (ad.shopName || "HKC Collection").trim().toLowerCase();
                      
                      // Count orders on this exact day for this shop from DB
                      const dbOrdersCount = orders.filter(o => {
                        if (o.paymentStatus === "Cancel") return false;
                        const oDate = new Date(o.date || o.createdAt).toISOString().slice(0, 10);
                        const oShop = (o.shopName || "HKC Collection").trim().toLowerCase();
                        return oDate === dateStr && oShop === adShopName;
                      }).length;

                      // Try to parse order count from note (e.g. "16 Order", "16 orders"), otherwise fall back to DB
                      const noteMatch = ad.note && ad.note.match(/(\d+)\s*order/i);
                      const ordersCount = noteMatch ? parseInt(noteMatch[1], 10) : dbOrdersCount;
                      
                      const avgPerOrder = ordersCount > 0 ? ad.amount / ordersCount : 0;
                      const sObj = shops.find(s => s.shopName === ad.shopName);
                      const pStyle = getPlatformStyle(ad.platform || sObj?.platform);

                      return (
                        <tr key={ad._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "12px 8px", fontSize: "13px", color: "var(--text-primary)", fontWeight: "500", whiteSpace: "nowrap" }}>
                            {adDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td style={{ padding: "12px 8px", fontSize: "13px", color: "var(--text-primary)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: "700" }}>{ad.shopName || "HKC Collection"}</span>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: pStyle.bg,
                                color: pStyle.color,
                                border: `1px solid ${pStyle.border}`
                              }}>
                                {ad.platform || sObj?.platform || "Meesho"}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 8px", fontSize: "13px", color: "var(--danger)", fontWeight: "700" }}>
                            ₹{ad.amount.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "12px 8px", fontSize: "13px", color: "var(--primary)", fontWeight: "600" }}>
                            {ordersCount > 0 ? `₹${avgPerOrder.toFixed(2)}` : "-"}
                          </td>
                          <td style={{ padding: "12px 8px", fontSize: "13px", color: "var(--text-secondary)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ad.note}>
                            {ad.note || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No details</span>}
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "8px" }}>
                              <button 
                                onClick={() => startEdit(ad)}
                                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: "4px" }}
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button 
                                onClick={() => handleDelete(ad._id)}
                                style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "4px" }}
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Edit Log Modal */}
      {editingAd && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Ads Spend Entry</h3>
              <button className="modal-close" onClick={() => setEditingAd(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "var(--text-primary)" }}>
                    Shop / Account
                  </label>
                  <select
                    value={editShopName}
                    onChange={(e) => setEditShopName(e.target.value)}
                    required
                    style={{ width: "100%", height: "38px", fontSize: "13px" }}
                  >
                    {shops.map(s => (
                      <option key={s._id} value={s.shopName}>
                        {s.shopName} ({s.platform || "Meesho"})
                      </option>
                    ))}
                    {shops.length === 0 && (
                      <option value="HKC Collection">HKC Collection (Meesho)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "var(--text-primary)" }}>Date</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)} 
                    max={new Date().toISOString().slice(0, 10)}
                    required 
                    style={{ width: "100%", height: "38px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "var(--text-primary)" }}>Ads Spend Amount (₹)</label>
                  <input 
                    type="number" 
                    value={editAmount} 
                    onChange={(e) => setEditAmount(e.target.value)} 
                    required 
                    min="0.01"
                    step="0.01"
                    style={{ width: "100%", height: "38px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px", color: "var(--text-primary)" }}>Note / Campaign Name</label>
                  <textarea 
                    value={editNote} 
                    onChange={(e) => setEditNote(e.target.value)} 
                    rows="3"
                    style={{ width: "100%", padding: "10px", borderRadius: "var(--border-radius-sm)", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingAd(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation and Alert Modals */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Ads Entry"
        message="Are you sure you want to delete this ads entry? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeleteId(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmModal
        isOpen={alertOpen}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => setAlertOpen(false)}
        isAlert={true}
        type="info"
      />

    </div>
  );
}

export default MeeshoAds;
