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
  FaCalculator 
} from "react-icons/fa";

function MeeshoAds() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter states
  const [searchText, setSearchText] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState(""); // YYYY-MM

  // Add Form States
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // Default today
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit Modal States
  const [editingAd, setEditingAd] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch ads on mount
  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch ads logs");
      const data = await res.json();
      // Filter for Advertising category
      const advertisingExpenses = data.filter(exp => exp.category === "Advertising");
      setAds(advertisingExpenses);
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
      alert("Please enter a valid ads amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: "Meesho Ads",
          category: "Advertising",
          amount: Number(amount),
          date: new Date(date).toISOString(),
          note: note.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to log ads spend");
      
      // Reset form (keep date as selected for quick entry of successive days)
      setAmount("");
      setNote("");
      
      // Refresh list
      await fetchAds();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open edit modal
  const startEdit = (ad) => {
    setEditingAd(ad);
    setEditDate(new Date(ad.date || ad.createdAt).toISOString().slice(0, 10));
    setEditAmount(ad.amount.toString());
    setEditNote(ad.note || "");
  };

  // Submit edited log
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editAmount || Number(editAmount) <= 0) {
      alert("Please enter a valid ads amount.");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/expenses/${editingAd._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: "Meesho Ads",
          category: "Advertising",
          amount: Number(editAmount),
          date: new Date(editDate).toISOString(),
          note: editNote.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to update ads log");
      setEditingAd(null);
      await fetchAds();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Delete ads log
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ads entry?")) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete ads entry");
      await fetchAds();
    } catch (err) {
      alert(err.message);
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
    let totalLastMonth = 0;
    let totalAllTime = 0;

    const monthlyBreakdownMap = {};

    ads.forEach((ad) => {
      const d = new Date(ad.date || ad.createdAt);
      const amountVal = ad.amount || 0;

      // Cumulative stats
      totalAllTime += amountVal;

      if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
        totalThisMonth += amountVal;
        // Keep track of unique dates logged this month
        loggedDaysThisMonth.add(d.toDateString());
      } else if (d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth) {
        totalLastMonth += amountVal;
      }

      // Group by Month/Year for breakdown list
      const monthKey = d.toLocaleString("en-US", { month: "long", year: "numeric" }); // e.g. "July 2026"
      if (!monthlyBreakdownMap[monthKey]) {
        monthlyBreakdownMap[monthKey] = {
          monthStr: monthKey,
          total: 0,
          entries: 0
        };
      }
      monthlyBreakdownMap[monthKey].total += amountVal;
      monthlyBreakdownMap[monthKey].entries += 1;
    });

    const avgDailyThisMonth = loggedDaysThisMonth.size > 0 
      ? totalThisMonth / loggedDaysThisMonth.size 
      : 0;

    // Convert breakdown map to sorted list
    const monthlyList = Object.values(monthlyBreakdownMap).sort((a, b) => {
      return new Date(b.monthStr) - new Date(a.monthStr);
    });

    return {
      totalThisMonth,
      avgDailyThisMonth,
      totalLastMonth,
      totalAllTime,
      monthlyList
    };
  }, [ads]);

  // ── Filters & Search ────────────────────────────────────────────────
  const filteredAds = useMemo(() => {
    return ads
      .filter((ad) => {
        // Date match
        const adDate = new Date(ad.date || ad.createdAt);
        if (filterMonthYear) {
          const [fYear, fMonth] = filterMonthYear.split("-");
          if (adDate.getFullYear() !== Number(fYear) || (adDate.getMonth() + 1) !== Number(fMonth)) {
            return false;
          }
        }

        // Search text match (checks notes)
        if (searchText.trim()) {
          const query = searchText.toLowerCase();
          const noteText = (ad.note || "").toLowerCase();
          const titleText = (ad.title || "").toLowerCase();
          return noteText.includes(query) || titleText.includes(query);
        }

        return true;
      })
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)); // Newest first
  }, [ads, filterMonthYear, searchText]);

  return (
    <div className="container" style={{ paddingBottom: "40px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <FaBullhorn style={{ color: "var(--primary)" }} /> Meesho Ads Manager
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Track and analyze your daily Meesho promotion expenses
          </p>
        </div>
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
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total for current month</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--info)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Daily Average</span>
            <div className="stat-card-icon"><FaCalculator /></div>
          </div>
          <div className="stat-card-value">₹{stats.avgDailyThisMonth.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Spent per active logged day</div>
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
        
        {/* Left Column: Log Entry Form & Monthly Summary (5 cols) */}
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
                  placeholder="e.g. Kurti Campaign Daily Budget"
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
                {stats.monthlyList.map((m, index) => (
                  <div 
                    key={index}
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      padding: "12px 16px", 
                      background: "var(--bg-primary)", 
                      border: "1px solid var(--border-color)", 
                      borderRadius: "8px" 
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
                        {m.entries} daily entries
                      </div>
                    </div>
                  </div>
                ))}
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
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
              {/* Text Search */}
              <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
                <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "var(--text-muted)", fontSize: "12px" }} />
                <input 
                  type="text" 
                  placeholder="Search campaigns or notes..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: "100%", paddingLeft: "32px", height: "34px", fontSize: "13px" }}
                />
              </div>

              {/* Month Filter */}
              <div>
                <input 
                  type="month" 
                  value={filterMonthYear}
                  onChange={(e) => setFilterMonthYear(e.target.value)}
                  style={{ height: "34px", fontSize: "13px", width: "150px" }}
                  title="Filter by Month"
                />
              </div>

              {/* Clear filters */}
              {(searchText || filterMonthYear) && (
                <button 
                  onClick={() => { setSearchText(""); setFilterMonthYear(""); }}
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
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Amount (₹)</th>
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>Note</th>
                      <th style={{ padding: "10px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAds.map((ad) => {
                      const adDate = new Date(ad.date || ad.createdAt);
                      return (
                        <tr key={ad._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "12px 8px", fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}>
                            {adDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td style={{ padding: "12px 8px", fontSize: "13px", color: "var(--danger)", fontWeight: "600" }}>
                            ₹{ad.amount.toLocaleString("en-IN")}
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

    </div>
  );
}

export default MeeshoAds;
