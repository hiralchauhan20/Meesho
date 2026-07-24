import { useState, useEffect, useMemo } from "react";
import { FaPlus, FaTrash, FaEdit, FaFileExport, FaCalendarAlt, FaSearch, FaTimes, FaBriefcase, FaExclamationTriangle, FaBoxes, FaCheckCircle } from "react-icons/fa";
import ConfirmModal from "../components/ConfirmModal";

function Investment() {
  const [investments, setInvestments] = useState([]);
  const [stocks, setStocks] = useState([]);
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
  const [status, setStatus] = useState("Complete"); // Default Complete

  // Edit Form States
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnitType, setEditUnitType] = useState("Dozen");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState("Complete");

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


  // Fetch investments on mount
  useEffect(() => {
    fetchInvestments();
    fetchStockSummary();
  }, []);

  async function fetchInvestments() {
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
  }

  async function fetchStockSummary() {
    try {
      const res = await fetch("/api/investments/stock", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStocks(data);
      }
    } catch (err) {
      console.error("Failed to fetch stock summary:", err);
    }
  }

  const handleQuickRestock = (pName) => {
    setProductName(pName);
    const formEl = document.getElementById("investment-entry-form");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };



  // Log new investment
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName.trim() || !price || !quantity) {
      showAlert("Please fill in Product Name, Quantity, and Price.", "Validation Error");
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
      setStatus("Complete");

      // Refresh list
      fetchInvestments();
      fetchStockSummary();
    } catch (err) {
      showAlert(err.message, "Error");
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
      fetchStockSummary();
    } catch (err) {
      showAlert(err.message, "Error");
    }
  };

  // Delete investment row
  const handleDeleteRow = (id) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false);
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/investments/${deleteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete entry");
      
      // Refresh list
      fetchInvestments();
      fetchStockSummary();
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setDeleteId(null);
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
      showAlert("Please fill in Product Name, Quantity, and Price.", "Validation Error");
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
      fetchStockSummary();
    } catch (err) {
      showAlert(err.message, "Error");
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
    let totalPcs = 0;
    let completeCount = 0;
    let pendingCount = 0;
    let pendingDozens = 0;
    let pendingPackets = 0;
    let pendingPcs = 0;

    filteredInvestments.forEach((inv) => {
      totalPrice += inv.price || 0;
      if (inv.unitType === "Dozen") {
        totalDozens += inv.quantity || 0;
        if (inv.status === "Pending") {
          pendingDozens += inv.quantity || 0;
        }
      } else if (inv.unitType === "Packets") {
        totalPackets += inv.quantity || 0;
        if (inv.status === "Pending") {
          pendingPackets += inv.quantity || 0;
        }
      } else if (inv.unitType === "Pcs") {
        totalPcs += inv.quantity || 0;
        if (inv.status === "Pending") {
          pendingPcs += inv.quantity || 0;
        }
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
      totalPcs,
      totalCount: filteredInvestments.length,
      completeCount,
      pendingCount,
      pendingDozens,
      pendingPackets,
      pendingPcs
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

      {/* Live Inventory & Stock Status Warning Alert */}
      {stocks.some(s => s.status === "OUT_OF_STOCK") && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "12px",
          padding: "14px 20px",
          marginBottom: "25px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          color: "var(--danger)",
          boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)"
        }}>
          <FaExclamationTriangle style={{ fontSize: "22px", flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "14px" }}>Stock Alert: Out of Stock Items Detected!</strong>
            <p style={{ fontSize: "12px", margin: "2px 0 0 0", opacity: 0.9 }}>
              The following products are completely out of stock based on your customer orders: {" "}
              <b>{stocks.filter(s => s.status === "OUT_OF_STOCK").map(s => s.productName).join(", ")}</b>.
              Please log new investments to re-stock.
            </p>
          </div>
        </div>
      )}

      {/* Stock Overview Table */}
      {stocks.length > 0 && (
        <div style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(12px)",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          padding: "20px",
          marginBottom: "25px",
          boxShadow: "var(--glass-shadow)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
              <FaBoxes style={{ color: "var(--primary)" }} /> Live Inventory & Stock Remaining
            </h3>
            <div style={{ display: "flex", gap: "10px", fontSize: "12px" }}>
              <span style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--success)", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
                In Stock: {stocks.filter(s => s.status === "IN_STOCK").length}
              </span>
              <span style={{ background: "rgba(245, 158, 11, 0.1)", color: "#d97706", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
                Low Stock: {stocks.filter(s => s.status === "LOW_STOCK").length}
              </span>
              <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
                Out of Stock: {stocks.filter(s => s.status === "OUT_OF_STOCK").length}
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(99, 102, 241, 0.04)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-secondary)", fontWeight: "600" }}>Product Name</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>Total Purchased</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>Sold in Orders</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>Stock Balance (Out of Total)</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>Status</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((item, idx) => {
                  const totalPcs = Math.max(item.totalPurchasedPcs, 1);
                  const remPcs = Math.max(0, item.remainingPcs);
                  const pct = Math.min(100, Math.max(0, (remPcs / totalPcs) * 100));

                  const progressColor = item.status === "OUT_OF_STOCK" 
                    ? "var(--danger)" 
                    : item.status === "LOW_STOCK" 
                    ? "#d97706" 
                    : "var(--success)";

                  return (
                    <tr key={idx} style={{ 
                      borderBottom: "1px solid var(--border-color)",
                      background: item.status === "OUT_OF_STOCK" ? "rgba(239, 68, 68, 0.04)" : "transparent"
                    }}>
                      <td style={{ padding: "12px 14px", fontWeight: "600", color: "var(--text-primary)" }}>
                        {item.productName}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--text-primary)" }}>
                        {item.totalPurchasedPcs} Pcs ({item.totalPurchasedDozens} Dz)
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--text-primary)", fontWeight: "500" }}>
                        {item.totalSoldPcs} Pcs
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: progressColor, marginBottom: "4px" }}>
                          {item.remainingPcs} / {item.totalPurchasedPcs} Pcs left ({item.remainingDozens} Dz)
                        </div>
                        {/* Visual Progress Bar */}
                        <div style={{ width: "120px", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", margin: "0 auto", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: progressColor, borderRadius: "3px", transition: "width 0.3s" }} />
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        {item.status === "OUT_OF_STOCK" ? (
                          <span style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "var(--danger)",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            border: "1px solid rgba(239, 68, 68, 0.3)"
                          }}>
                            <FaExclamationTriangle /> OUT OF STOCK
                          </span>
                        ) : item.status === "LOW_STOCK" ? (
                          <span style={{
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#b45309",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            border: "1px solid rgba(245, 158, 11, 0.3)"
                          }}>
                            <FaExclamationTriangle /> LOW STOCK
                          </span>
                        ) : (
                          <span style={{
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "var(--success)",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            border: "1px solid rgba(34, 197, 94, 0.3)"
                          }}>
                            <FaCheckCircle /> IN STOCK
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(item.productName)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: item.status === "OUT_OF_STOCK" ? "var(--danger)" : "var(--primary)",
                            color: "#fff",
                            border: "none",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                          }}
                          title="Add new stock purchase for this item"
                        >
                          <FaPlus style={{ fontSize: "10px" }} /> Re-Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}


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

        {/* Clear Filters */}
        {(searchText || filterDate) && (
          <button 
            onClick={() => { setSearchText(""); setFilterDate(""); }}
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
            <span style={{ borderLeft: "1px solid var(--border-color)", paddingLeft: "10px" }}>{stats.totalPcs} Pcs</span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Quick Entry Form */}
      <form 
        id="investment-entry-form"
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
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 0.8fr 1fr 1.2fr auto", gap: "16px", alignItems: "end" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Product Name</label>
            <input 
              type="text" 
              placeholder="e.g. Thank You Card, Meesho Kothadi" 
              value={productName} 
              onChange={(e) => setProductName(e.target.value)} 
              required 
              style={{ width: "100%" }} 
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Qty</label>
            <input type="number" min="0.01" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Unit</label>
            <select value={unitType} onChange={(e) => setUnitType(e.target.value)} style={{ width: "100%" }}>
              <option value="Dozen">Dozen</option>
              <option value="Packets">Packets</option>
              <option value="Pcs">Pcs</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Price (₹)</label>
            <input type="number" min="0" placeholder="Total Cost" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ width: "100%" }} />
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
                <th style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600", width: "100px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "14px" }}>No transactions logged.</td>
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
                    <div>{stats.totalDozens} Dz / {stats.totalPackets} Pkt / {stats.totalPcs} Pcs</div>
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
                  <input type="number" min="0.01" step="any" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} required />
                </div>
                <div>
                  <label>Unit Type</label>
                  <select value={editUnitType} onChange={(e) => setEditUnitType(e.target.value)}>
                    <option value="Dozen">Dozen</option>
                    <option value="Packets">Packets</option>
                    <option value="Pcs">Pcs</option>
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

      {/* Custom Confirmation and Alert Modals */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Investment Log"
        message="Are you sure you want to delete this investment transaction? This action cannot be undone."
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

export default Investment;
