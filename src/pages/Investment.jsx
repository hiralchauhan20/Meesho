import { useState, useEffect, useMemo } from "react";
import { FaPlus, FaTrash, FaEdit, FaTable, FaFileExport, FaCalendarAlt, FaSearch, FaTimes, FaBriefcase } from "react-icons/fa";

function Investment() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search / Filter states
  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form states for fast entry
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // Default today
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitType, setUnitType] = useState("Dozen"); // Dozen or Packets
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Pending"); // Pending or Complete

  // Edit Form States
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnitType, setEditUnitType] = useState("Dozen");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState("Pending");

  // Fetch investments on mount
  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      const res = await fetch("/api/investments", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch investments");
      const data = await res.json();
      setInvestments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Log new investment
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName.trim() || !price || !quantity) {
      alert("Please fill in Product Name, Quantity, and Price.");
      return;
    }

    try {
      const payload = {
        date: new Date(date).toISOString(),
        productName: productName.trim(),
        quantity: Number(quantity),
        unitType,
        price: Number(price),
        status
      };

      const res = await fetch("/api/investments/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to add investment entry");

      // Reset form (keep date to default today)
      setProductName("");
      setQuantity("1");
      setUnitType("Dozen");
      setPrice("");
      setStatus("Pending");

      // Refresh list
      fetchInvestments();
    } catch (err) {
      alert(err.message);
    }
  };

  // Inline status change handler
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/investments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      // Update local state directly for responsive feel
      setInvestments(prev => prev.map(inv => inv._id === id ? { ...inv, status: newStatus } : inv));
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete investment row
  const handleDeleteRow = async (id) => {
    if (!window.confirm("Are you sure you want to delete this investment transaction?")) return;
    try {
      const res = await fetch(`/api/investments/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete entry");
      
      // Refresh list
      fetchInvestments();
    } catch (err) {
      alert(err.message);
    }
  };

  // Edit modal opener
  const startEdit = (inv) => {
    setEditingInvestment(inv);
    setEditDate(new Date(inv.date || inv.createdAt).toISOString().slice(0, 10));
    setEditProductName(inv.productName || "");
    setEditQuantity(inv.quantity || "1");
    setEditUnitType(inv.unitType || "Dozen");
    setEditPrice(inv.price || "");
    setEditStatus(inv.status || "Pending");
  };

  // Edit modal submit handler
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editProductName.trim() || !editQuantity || !editPrice) {
      alert("Please fill in Product Name, Quantity, and Price.");
      return;
    }

    try {
      const payload = {
        date: new Date(editDate).toISOString(),
        productName: editProductName.trim(),
        quantity: Number(editQuantity),
        unitType: editUnitType,
        price: Number(editPrice),
        status: editStatus
      };

      const res = await fetch(`/api/investments/${editingInvestment._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update entry");

      setEditingInvestment(null);
      fetchInvestments();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter logic
  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      // 1. Text Search (Product Name)
      const matchesSearch = inv.productName?.toLowerCase().includes(searchText.toLowerCase());
      
      // 2. Date Filter
      const entryDate = new Date(inv.date || inv.createdAt).toISOString().slice(0, 10);
      const matchesDate = !filterDate || entryDate === filterDate;
      
      // 3. Status Filter
      const matchesStatus = !filterStatus || inv.status === filterStatus;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [investments, searchText, filterDate, filterStatus]);

  // Compute stats on filtered list
  const stats = useMemo(() => {
    let totalPrice = 0;
    let totalDozens = 0;
    let totalPackets = 0;
    let completeCount = 0;
    let pendingCount = 0;

    filteredInvestments.forEach((inv) => {
      totalPrice += inv.price || 0;
      if (inv.unitType === "Dozen") {
        totalDozens += inv.quantity || 0;
      } else {
        totalPackets += inv.quantity || 0;
      }

      if (inv.status === "Complete") {
        completeCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalPrice,
      totalDozens,
      totalPackets,
      totalCount: filteredInvestments.length,
      completeCount,
      pendingCount
    };
  }, [filteredInvestments]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredInvestments.length === 0) return;
    const headers = ["Date", "Product Name", "Quantity", "Unit Type", "Price", "Status"];
    const rows = filteredInvestments.map(inv => [
      new Date(inv.date || inv.createdAt).toLocaleDateString("en-IN"),
      inv.productName,
      inv.quantity,
      inv.unitType,
      inv.price,
      inv.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Investment_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="ledger-container">
      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Investment & Inventory Purchases</h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Log and monitor your capital investments, bulk product packages, and payment status.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={filteredInvestments.length === 0}
          className="btn btn-secondary" 
          style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px" }}
        >
          <FaFileExport /> Export CSV
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div 
        style={{ 
          background: "var(--glass-bg)", 
          backdropFilter: "blur(12px)", 
          borderRadius: "12px", 
          border: "1px solid var(--border-color)", 
          padding: "16px", 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "16px", 
          alignItems: "center",
          marginBottom: "20px",
          boxShadow: "var(--glass-shadow)"
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
          <FaSearch style={{ position: "absolute", left: "12px", top: "12px", color: "var(--text-muted)", fontSize: "14px" }} />
          <input
            type="text"
            placeholder="Search by Product Name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: "100%", paddingLeft: "38px", height: "38px", fontSize: "13px" }}
          />
        </div>

        {/* Date Filter */}
        <div style={{ position: "relative" }}>
          <FaCalendarAlt style={{ position: "absolute", left: "10px", top: "11px", color: "var(--text-muted)", fontSize: "12px" }} />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            style={{ paddingLeft: "32px", height: "38px", fontSize: "13px", width: "170px" }}
            title="Filter by Date"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ height: "38px", fontSize: "13px", padding: "0 12px", minWidth: "140px" }}
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Complete">Complete</option>
        </select>

        {/* Clear Filters */}
        {(searchText || filterDate || filterStatus) && (
          <button 
            onClick={() => { setSearchText(""); setFilterDate(""); setFilterStatus(""); }}
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

        {/* Summary Badge (aligned to right on desktop) */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", display: "flex", gap: "10px", color: "var(--primary)" }}>
            <span>Invested: ₹{stats.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <span style={{ borderLeft: "1px solid var(--border-color)", paddingLeft: "10px" }}>{stats.totalDozens} Dz</span>
            <span style={{ borderLeft: "1px solid var(--border-color)", paddingLeft: "10px" }}>{stats.totalPackets} Pkt</span>
          </div>
          <div style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "var(--success)" }}>
            Complete: {stats.completeCount}
          </div>
          <div style={{ background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.2)", padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#d97706" }}>
            Pending: {stats.pendingCount}
          </div>
        </div>
      </div>

      {/* Spreadsheet Quick Entry Form */}
      <form 
        onSubmit={handleSubmit}
        style={{ 
          background: "var(--glass-bg)", 
          backdropFilter: "blur(12px)", 
          borderRadius: "12px", 
          border: "1px solid var(--border-color)", 
          padding: "20px", 
          marginBottom: "30px",
          boxShadow: "var(--glass-shadow)"
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "var(--primary)" }}>
          <FaBriefcase /> Log New Investment / Inventory Purchase
        </h3>
        
        {/* Entry Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: "16px", alignItems: "end" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Product Name</label>
            <input 
              type="text" 
              placeholder="e.g. Cotton Fabrics" 
              value={productName} 
              onChange={(e) => setProductName(e.target.value)} 
              required 
              style={{ width: "100%" }} 
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Qty</label>
              <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Unit</label>
              <select value={unitType} onChange={(e) => setUnitType(e.target.value)} style={{ width: "90px" }}>
                <option value="Dozen">Dozen</option>
                <option value="Packets">Packets</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Price (₹)</label>
            <input type="number" min="0" placeholder="Total Cost" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }}>
              <option value="Pending">Pending</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "8px", 
              height: "38px", 
              padding: "0 20px",
              fontWeight: "600" 
            }}
          >
            <FaPlus /> Insert
          </button>
        </div>
      </form>

      {/* Ledger Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", fontSize: "14px", color: "var(--text-secondary)" }}>Loading investment data...</div>
      ) : error ? (
        <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "16px", color: "var(--danger)", fontSize: "14px" }}>Error: {error}</div>
      ) : (
        <div 
          style={{ 
            background: "var(--glass-bg)", 
            backdropFilter: "blur(12px)", 
            borderRadius: "12px", 
            border: "1px solid var(--border-color)", 
            overflowX: "auto", 
            boxShadow: "var(--glass-shadow)" 
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "rgba(99, 102, 241, 0.04)", borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: "600" }}>Date</th>
                <th style={{ padding: "14px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: "600" }}>Product Name</th>
                <th style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>Quantity</th>
                <th style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>Unit Type</th>
                <th style={{ padding: "14px 16px", textAlign: "right", color: "var(--text-secondary)", fontWeight: "600" }}>Price (₹)</th>
                <th style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600", width: "100px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>No transactions logged.</td>
                </tr>
              ) : (
                filteredInvestments.map((inv) => {
                  return (
                    <tr key={inv._id} className="ledger-row-hover" style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }}>
                      <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>
                        {new Date(inv.date || inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: "500" }}>
                        {inv.productName}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-primary)" }}>
                        {inv.quantity}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-secondary)" }}>
                        {inv.unitType}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", color: "var(--text-primary)", fontWeight: "600" }}>
                        ₹{(inv.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <select 
                          value={inv.status} 
                          onChange={(e) => handleStatusChange(inv._id, e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            border: "none",
                            cursor: "pointer",
                            width: "110px",
                            textAlign: "center",
                            background: inv.status === "Complete" ? "rgba(34, 197, 94, 0.12)" : "rgba(234, 179, 8, 0.12)",
                            color: inv.status === "Complete" ? "var(--success)" : "#b45309"
                          }}
                        >
                          <option value="Pending" style={{ color: "#b45309", background: "var(--card-bg)" }}>Pending</option>
                          <option value="Complete" style={{ color: "var(--success)", background: "var(--card-bg)" }}>Complete</option>
                        </select>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "4px", alignItems: "center" }}>
                          <button 
                            type="button"
                            onClick={() => startEdit(inv)}
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: "var(--primary)", 
                              cursor: "pointer", 
                              fontSize: "15px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              transition: "all var(--transition-fast)"
                            }}
                            className="edit-btn-hover"
                            title="Edit Row"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteRow(inv._id)} 
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: "rgba(239, 68, 68, 0.7)", 
                              cursor: "pointer", 
                              fontSize: "15px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              transition: "all var(--transition-fast)"
                            }}
                            className="delete-btn-hover"
                            title="Delete Row"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Bottom Summary Row */}
              {filteredInvestments.length > 0 && (
                <tr 
                  style={{ 
                    background: "rgba(99, 102, 241, 0.08)", 
                    fontWeight: "700", 
                    borderTop: "2px solid var(--primary)",
                    borderBottom: "2px solid var(--primary)" 
                  }}
                >
                  <td colSpan="2" style={{ padding: "16px", textTransform: "uppercase", fontSize: "12px", color: "var(--primary)", letterSpacing: "1px" }}>
                    Total Investment Summary
                  </td>
                  <td style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--text-primary)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total Units</div>
                    <div>{stats.totalDozens} Dz / {stats.totalPackets} Pkt</div>
                  </td>
                  <td style={{ padding: "16px" }}></td>
                  <td 
                    style={{ 
                      padding: "16px", 
                      textAlign: "right", 
                      fontSize: "15px", 
                      fontWeight: "800", 
                      color: "var(--primary)" 
                    }}
                  >
                    ₹{stats.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan="2" style={{ padding: "16px" }}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Sale Transaction Modal */}
      {editingInvestment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Investment Entry</h3>
              <button className="modal-close" onClick={() => setEditingInvestment(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div>
                  <label>Date</label>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} required />
                </div>
                <div className="form-full">
                  <label>Product Name</label>
                  <input 
                    type="text" 
                    value={editProductName} 
                    onChange={(e) => setEditProductName(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label>Quantity</label>
                  <input type="number" min="1" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} required />
                </div>
                <div>
                  <label>Unit Type</label>
                  <select value={editUnitType} onChange={(e) => setEditUnitType(e.target.value)}>
                    <option value="Dozen">Dozen</option>
                    <option value="Packets">Packets</option>
                  </select>
                </div>
                <div>
                  <label>Price (₹)</label>
                  <input type="number" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required />
                </div>
                <div>
                  <label>Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingInvestment(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Investment;
