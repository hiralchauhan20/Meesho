import { useState, useEffect, useMemo } from "react";
import { FaFileInvoiceDollar, FaExclamationTriangle, FaCheckCircle, FaTimes, FaCalendarAlt, FaSearch, FaEdit, FaStore } from "react-icons/fa";
import { API_URL } from "../config";

function Claims() {
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter states
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "", "Pending", "Approved", "Rejected"
  const [filterProduct, setFilterProduct] = useState("");

  // Edit Modal States
  const [editingOrder, setEditingOrder] = useState(null);
  const [editClaimStatus, setEditClaimStatus] = useState("Pending");
  const [editClaimAmount, setEditClaimAmount] = useState("0");
  const [saving, setSaving] = useState(false);

  // Custom Alert States
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("Alert");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message, title = "Notice") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  useEffect(() => {
    fetchOrders();
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await fetch(`${API_URL}/api/shops`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setShops(data);
      }
    } catch (err) {
      console.error("Failed to fetch shops:", err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${editingOrder._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          claimStatus: editClaimStatus,
          claimAmount: editClaimStatus === "Approved" ? (Number(editClaimAmount) || 0) : 0
        })
      });

      if (!res.ok) throw new Error("Failed to update claim data");
      setEditingOrder(null);
      fetchOrders();
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleInlineClaimStatusChange = async (o, newStatus) => {
    if (newStatus === "Approved") {
      setEditingOrder(o);
      setEditClaimStatus("Approved");
      setEditClaimAmount(o.claimAmount !== undefined && o.claimAmount > 0 ? String(o.claimAmount) : "");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/orders/${o._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          claimStatus: newStatus,
          claimAmount: 0
        })
      });
      if (!res.ok) throw new Error("Failed to update claim status");
      fetchOrders();
    } catch (err) {
      showAlert(err.message, "Error");
    }
  };

  const startEdit = (o) => {
    setEditingOrder(o);
    const effectiveStatus = (o.claimStatus && o.claimStatus !== "No Claim") ? o.claimStatus : "Pending";
    setEditClaimStatus(effectiveStatus);
    setEditClaimAmount(o.claimAmount !== undefined ? String(o.claimAmount) : "0");
  };

  // Global Claims Stats (calculated from all transactions matching shop filter)
  const claimStats = useMemo(() => {
    let totalClaims = 0;
    let pendingClaims = 0;
    let approvedClaims = 0;
    let rejectedClaims = 0;
    let approvedAmount = 0;

    orders.forEach((o) => {
      const isClaim = (o.claimStatus && o.claimStatus !== "No Claim") || o.paymentStatus === "Wrong Return";
      if (!isClaim) return;
      if (selectedShop && (o.shopName || "HKC Collection") !== selectedShop) return;

      totalClaims++;
      const effectiveStatus = (o.claimStatus && o.claimStatus !== "No Claim") ? o.claimStatus : "Pending";
      if (effectiveStatus === "Pending") {
        pendingClaims++;
      } else if (effectiveStatus === "Approved") {
        approvedClaims++;
        approvedAmount += o.claimAmount || 0;
      } else if (effectiveStatus === "Rejected") {
        rejectedClaims++;
      }
    });

    return { totalClaims, pendingClaims, approvedClaims, rejectedClaims, approvedAmount };
  }, [orders, selectedShop]);

  // Unique product options for the filter dropdown
  const filterProductsList = useMemo(() => {
    const prods = new Set();
    orders.forEach(o => {
      const isClaim = (o.claimStatus && o.claimStatus !== "No Claim") || o.paymentStatus === "Wrong Return";
      if (isClaim) {
        if (!selectedShop || (o.shopName || "HKC Collection") === selectedShop) {
          prods.add(o.productName || o.productId?.productName);
        }
      }
    });
    return Array.from(prods).filter(Boolean);
  }, [orders, selectedShop]);

  // Filtered claims list
  const filteredClaims = useMemo(() => {
    return orders.filter(o => {
      // Must be a wrong return or claim
      const isClaim = (o.claimStatus && o.claimStatus !== "No Claim") || o.paymentStatus === "Wrong Return";
      if (!isClaim) return false;

      // Shop Match
      if (selectedShop && (o.shopName || "HKC Collection") !== selectedShop) return false;

      const effectiveStatus = (o.claimStatus && o.claimStatus !== "No Claim") ? o.claimStatus : "Pending";

      // Status Match
      if (filterStatus && effectiveStatus !== filterStatus) return false;

      // Product Match
      if (filterProduct && (o.productName || o.productId?.productName) !== filterProduct) return false;

      // Text Search Match (Order No or AWB ID)
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const orderNo = (o.orderNo || "").toLowerCase();
        const awbId = (o.awbId || "").toLowerCase();
        if (!orderNo.includes(query) && !awbId.includes(query)) return false;
      }

      return true;
    });
  }, [orders, selectedShop, filterStatus, filterProduct, searchText]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 10px" }}>
      
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", margin: 0, color: "var(--text-primary)" }}>
            <FaFileInvoiceDollar style={{ color: "var(--primary)" }} /> Platform Claims Tracker
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Track details of all Wrong Returns, filed claims, approved reimbursements, and pending requests
          </p>
        </div>

        {/* Shop / Account Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FaStore style={{ color: "var(--primary)" }} />
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              cursor: "pointer"
            }}
          >
            <option value="">🏢 All Shops / Accounts</option>
            {shops.map((s) => (
              <option key={s._id} value={s.shopName}>
                {s.shopName} ({s.platform})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: "14px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Claims Summary Cards */}
      <div className="cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div className="stat-card" style={{ "--card-accent": "var(--primary)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Total Claims Filed</span>
            <div className="stat-card-icon"><FaFileInvoiceDollar /></div>
          </div>
          <div className="stat-card-value">{claimStats.totalClaims}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total wrong/returns claimed</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--warning)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Claims Pending</span>
            <div className="stat-card-icon"><FaExclamationTriangle /></div>
          </div>
          <div className="stat-card-value">{claimStats.pendingClaims}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Awaiting response from Platforms</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--success)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Claims Approved</span>
            <div className="stat-card-icon"><FaCheckCircle /></div>
          </div>
          <div className="stat-card-value">{claimStats.approvedClaims}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Recovered: ₹{claimStats.approvedAmount.toLocaleString("en-IN")}</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--danger)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Claims Rejected</span>
            <div className="stat-card-icon"><FaTimes /></div>
          </div>
          <div className="stat-card-value">{claimStats.rejectedClaims}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Rejected / Cancelled claims</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "var(--glass-shadow)"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          alignItems: "flex-end"
        }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Search ID</label>
            <div style={{ position: "relative" }}>
              <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "var(--text-muted)", fontSize: "12px" }} />
              <input
                type="text"
                placeholder="Order No. / AWB ID..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ paddingLeft: "32px", height: "38px", fontSize: "13px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Claim Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Product Filter</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="">All Products</option>
              {filterProductsList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)", fontSize: "15px" }}>
          Loading claims data...
        </div>
      ) : (
        <div 
          className="table-container animate-fade" 
          style={{ 
            boxShadow: "var(--glass-shadow)", 
            borderRadius: "12px", 
            border: "1px solid var(--border-color)",
            background: "var(--glass-bg)",
            overflowX: "auto"
          }}
        >
          <table className="premium-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.25)", borderBottom: "2px solid var(--border-color)" }}>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Date</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Shop</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Order No.</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>AWB ID</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Product Name</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Order Status</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Claim Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px" }}>Claim Amount (₹)</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px", fontSize: "14px" }}>
                    No return claims match your filter.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((o, idx) => {
                  const prodName = o.productName || o.productId?.productName || "Unknown Product";
                  const formattedDate = new Date(o.date || o.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  });
                  const effectiveStatus = (o.claimStatus && o.claimStatus !== "No Claim") ? o.claimStatus : "Pending";
                  const orderShop = o.shopName || "HKC Collection";
                  const orderPlatform = o.shopPlatform || "Meesho";

                  return (
                    <tr 
                      key={o._id} 
                      style={{ 
                        borderBottom: "1px solid var(--border-color)",
                        background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                        transition: "background var(--transition-fast)"
                      }}
                      className="ledger-row-hover"
                    >
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FaCalendarAlt style={{ color: "var(--text-muted)" }} />
                          {formattedDate}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "12px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor: orderPlatform === "Flipkart" ? "rgba(40, 116, 240, 0.15)" : orderPlatform === "Amazon" ? "rgba(255, 153, 0, 0.15)" : "rgba(244, 51, 151, 0.15)",
                          color: orderPlatform === "Flipkart" ? "#60a5fa" : orderPlatform === "Amazon" ? "#fbbf24" : "#f472b6",
                          border: `1px solid ${orderPlatform === "Flipkart" ? "rgba(40, 116, 240, 0.3)" : orderPlatform === "Amazon" ? "rgba(255, 153, 0, 0.3)" : "rgba(244, 51, 151, 0.3)"}`
                        }}>
                          {orderShop}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                        {o.orderNo || "-"}
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                        {o.awbId || "-"}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "var(--text-primary)", fontSize: "13px" }}>
                        {prodName}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: o.paymentStatus === "Wrong Return" ? "rgba(239, 68, 68, 0.2)" : "rgba(139, 92, 246, 0.15)",
                          color: o.paymentStatus === "Wrong Return" ? "var(--danger)" : "#a78bfa"
                        }}>
                          {o.paymentStatus || "Wrong Return"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: "13px" }}>
                        <select
                          value={effectiveStatus}
                          onChange={(e) => handleInlineClaimStatusChange(o, e.target.value)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "700",
                            border: "1px solid var(--border-color)",
                            cursor: "pointer",
                            width: "120px",
                            backgroundColor: 
                              effectiveStatus === "Approved" ? "rgba(16, 185, 129, 0.15)" :
                              effectiveStatus === "Pending" ? "rgba(245, 158, 11, 0.15)" :
                              "rgba(239, 68, 68, 0.15)",
                            color:
                              effectiveStatus === "Approved" ? "var(--success)" :
                              effectiveStatus === "Pending" ? "var(--warning)" :
                              "var(--danger)"
                          }}
                        >
                          <option value="Pending" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>⏳ Pending</option>
                          <option value="Approved" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>✅ Approved</option>
                          <option value="Rejected" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>❌ Rejected</option>
                        </select>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px", fontWeight: "600", color: effectiveStatus === "Approved" ? "var(--success)" : "var(--text-secondary)" }}>
                        ₹{(o.claimAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <button 
                          type="button"
                          onClick={() => startEdit(o)}
                          style={{
                            background: "rgba(99, 102, 241, 0.1)",
                            border: "1px solid rgba(99, 102, 241, 0.3)",
                            color: "var(--primary)",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                          title="Edit Claim"
                        >
                          <FaEdit /> Edit Claim
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Claim Modal */}
      {editingOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Claim</h3>
              <button className="modal-close" onClick={() => setEditingOrder(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Shop: </span>
                  <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>{editingOrder.shopName || "HKC Collection"}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Order No: </span>
                  <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>{editingOrder.orderNo || "-"}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Product: </span>
                  <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>{editingOrder.productName || editingOrder.productId?.productName}</strong>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Claim Status</label>
                  <select value={editClaimStatus} onChange={(e) => setEditClaimStatus(e.target.value)} style={{ height: "38px" }}>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {editClaimStatus === "Approved" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Claim Reimbursement Received (₹)</label>
                    <input 
                      type="number" 
                      value={editClaimAmount} 
                      onChange={(e) => setEditClaimAmount(e.target.value)} 
                      min="0" 
                      step="0.01" 
                      style={{ height: "38px", padding: "0 12px" }}
                      required
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ marginTop: "20px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingOrder(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 className="modal-title">{alertTitle}</h3>
              <button className="modal-close" onClick={() => setAlertOpen(false)}>&times;</button>
            </div>
            <div style={{ padding: "16px 0", color: "var(--text-primary)", fontSize: "14px" }}>
              {alertMessage}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setAlertOpen(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Claims;
