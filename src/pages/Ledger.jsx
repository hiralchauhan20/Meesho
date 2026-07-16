import { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaTable, FaFileExport, FaCalendarAlt, FaTruck, FaMapMarkerAlt, FaFileInvoice } from "react-icons/fa";

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Jammu & Kashmir", "Other UT"
];

const calculateOrderProfit = (o) => {
  const paymentStatus = o.paymentStatus || "Pending";
  if (paymentStatus === "Pending" || paymentStatus === "Cancel" || paymentStatus === "RTO Returned") {
    return 0;
  }
  if (paymentStatus === "Return") {
    return -157;
  }
  
  // Complete state: calculate profit normally
  const purchaseVal = o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || 0);
  const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
  const gstRate = o.gst || o.productId?.gst || 0;
  const qtyVal = o.quantity || 1;
  const gstAmount = (sellingVal * gstRate) / 100;
  return (sellingVal - purchaseVal - gstAmount) * qtyVal;
};

function Ledger() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states for fast entry
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // Default today
  const [orderNo, setOrderNo] = useState(""); // Meesho Order ID
  const [productName, setProductName] = useState("");
  const [customerState, setCustomerState] = useState("Gujarat"); // India State
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [gst, setGst] = useState("18"); // Default 18% GST
  const [courierPartner, setCourierPartner] = useState("Valmo"); // Default Valmo courier
  const [awbId, setAwbId] = useState(""); // Airway Bill / Tracking ID

  const handleProductNameChange = (value) => {
    setProductName(value);
    const lower = value.toLowerCase();
    
    // Autofill Buying Price based on matching rules
    if (lower.includes("air bra") && (lower.includes("pack of 3") || lower.includes("3 pack") || lower.includes("pack 3"))) {
      setPurchasePrice("87");
    } else if (lower.includes("air bra") && (lower.includes("pack of 6") || lower.includes("6 pack") || lower.includes("pack 6"))) {
      setPurchasePrice("168");
    } else if ((lower.includes("magical bra") || lower.includes("megical bra")) && (lower.includes("pack of 3") || lower.includes("3 pack") || lower.includes("pack 3"))) {
      setPurchasePrice("75");
    } else if ((lower.includes("magical bra") || lower.includes("megical bra")) && (lower.includes("pack of 6") || lower.includes("6 pack") || lower.includes("pack 6"))) {
      setPurchasePrice("144");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch accounts data");
      const data = await res.json();
      // Sort by date descending
      const sorted = data.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      setOrders(sorted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = async (e) => {
    e.preventDefault();
    if (!productName.trim() || !purchasePrice || !sellingPrice) {
      alert("Please fill in the Product Name, Purchase Price, and Selling Price.");
      return;
    }

    try {
      const payload = {
        orderNo: orderNo.trim(),
        awbId: awbId.trim(),
        customerState,
        productName: productName.trim(),
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        quantity: Number(quantity),
        shippingCost: 0, // Set to 0 since field is removed
        gst: Number(gst),
        courierPartner,
        paymentStatus: "Pending",
        date: new Date(date).toISOString(),
        customerName: "Meesho Buyer",
        status: "Completed",
        deliveryStatus: "Delivered"
      };

      const res = await fetch("/api/orders/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to add entry to accounts");

      // Reset entry form except product name if they want to log different pricing or dates
      setOrderNo("");
      setAwbId("");
      setProductName("");
      setPurchasePrice("");
      setSellingPrice("");
      setQuantity("1");
      setGst("18");
      setCourierPartner("Valmo");
      setCustomerState("Gujarat");

      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRow = async (id) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete entry");

      setOrders(orders.filter((o) => o._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ paymentStatus: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");

      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, paymentStatus: newStatus } : o)));
    } catch (err) {
      alert(err.message);
    }
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Meesho Accounts - Spreadsheet\n\n";
    csvContent += "Date,Order No,AWB ID,Product Name,State,Purchase Price (Buying),Selling Price,Quantity,GST (%),Courier Partner,Payment Status,Net Profit\n";

    orders.forEach((o) => {
      const purchaseVal = o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || 0);
      const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
      const gstRate = o.gst || o.productId?.gst || 0;
      const qtyVal = o.quantity || 1;
      const courier = o.courierPartner || "Valmo";
      const orderNumber = o.orderNo || "";
      const awbNumber = o.awbId || "";
      const state = o.customerState || "Gujarat";
      
      const profit = calculateOrderProfit(o);
      const formattedDate = new Date(o.date || o.createdAt).toLocaleDateString("en-IN");
      const prodName = o.productName || o.productId?.productName || "Unknown Product";
      const payStatus = o.paymentStatus || "Pending";
      csvContent += `"${formattedDate}","${orderNumber}","${awbNumber}","${prodName}","${state}",${purchaseVal},${sellingVal},${qtyVal},${gstRate},"${courier}","${payStatus}",${profit.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `meesho_accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLedgerStats = () => {
    let totalQty = 0;
    let totalPurchase = 0;
    let totalSales = 0;
    let totalProfit = 0;

    orders.forEach((o) => {
      const purchaseVal = o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || 0);
      const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
      const gstRate = o.gst || o.productId?.gst || 0;
      const qtyVal = o.quantity || 1;
      
      const profit = calculateOrderProfit(o);
      const payStatus = o.paymentStatus || "Pending";
      
      totalQty += qtyVal;
      totalProfit += profit;
      if (payStatus === "Complete") {
        totalPurchase += purchaseVal * qtyVal;
        totalSales += sellingVal * qtyVal;
      }
    });

    return { totalQty, totalPurchase, totalSales, totalProfit };
  };

  const stats = getLedgerStats();

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 10px" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div className="page-title-group">
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>Accounts</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
            Record product purchases, selling prices, and track instant profits like Excel
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={exportCSV} 
          style={{ gap: "8px", height: "42px", padding: "0 16px", borderRadius: "8px" }}
        >
          <FaFileExport /> Export to Excel (CSV)
        </button>
      </div>

      {error && (
        <div style={{ padding: "14px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Spreadsheet Quick Entry Form */}
      <form 
        onSubmit={handleAddRow} 
        style={{ 
          background: "var(--glass-bg)", 
          border: "1px solid var(--border-color)", 
          borderRadius: "12px", 
          padding: "24px", 
          marginBottom: "30px",
          boxShadow: "var(--glass-shadow)"
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "var(--primary)" }}>
          <FaTable /> Log New Sale Transaction
        </h3>
        
        {/* Balanced Grid for Desktop and Tablet */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          
          {/* Row 1: General Details */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Order No. / ID</label>
            <input type="text" placeholder="e.g. 30880548..." value={orderNo} onChange={(e) => setOrderNo(e.target.value.replace(/\D/g, ""))} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Customer State</label>
            <select value={customerState} onChange={(e) => setCustomerState(e.target.value)} style={{ width: "100%" }}>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Courier Partner</label>
            <select value={courierPartner} onChange={(e) => setCourierPartner(e.target.value)} style={{ width: "100%" }}>
              <option value="Valmo">Valmo</option>
              <option value="Xpressbees">Xpressbees</option>
              <option value="Shadowfax">Shadowfax</option>
              <option value="Delhivery">Delhivery</option>
              <option value="Ecom">Ecom</option>
            </select>
          </div>

          {/* Row 2: Product info */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Product Name</label>
            <input 
              type="text" 
              placeholder="e.g. Air Bra (Pack of 3)" 
              value={productName} 
              onChange={(e) => handleProductNameChange(e.target.value)} 
              list="product-suggestions"
              required 
              style={{ width: "100%" }} 
            />
            <datalist id="product-suggestions">
              <option value="Air Bra (Pack of 3)" />
              <option value="Air Bra (Pack of 6)" />
              <option value="Magical Bra (Pack of 3)" />
              <option value="Magical Bra (Pack of 6)" />
            </datalist>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Buying Price (₹)</label>
            <input type="number" min="0" placeholder="Your buying price" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Selling Price (₹)</label>
            <input type="number" min="0" placeholder="Meesho selling price" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required style={{ width: "100%" }} />
          </div>

          {/* Row 3: Metrics & Insert */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Quantity (Qty)</label>
            <input type="number" min="1" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>GST Rate (%)</label>
            <select value={gst} onChange={(e) => setGst(e.target.value)} style={{ width: "100%" }}>
              <option value="0">0% GST</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>AWB ID / Tracking No.</label>
            <input type="text" placeholder="e.g. 1435252..." value={awbId} onChange={(e) => setAwbId(e.target.value.replace(/\D/g, ""))} style={{ width: "100%" }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                width: "100%", 
                height: "44px", 
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
              <FaPlus /> Insert Row
            </button>
          </div>

        </div>
      </form>

      {/* Spreadsheet Table Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)", fontSize: "15px" }}>
          Loading accounts...
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
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Order No.</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>AWB ID</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Product Name</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>State</th>
                <th style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px" }}>Buying (₹)</th>
                <th style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px" }}>Selling (₹)</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px" }}>Qty</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px" }}>GST</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Courier</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Payment</th>
                <th style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px" }}>Net Profit (₹)</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px", fontSize: "14px" }}>
                    No transactions logged in your accounts. Insert a row above to get started.
                  </td>
                </tr>
              ) : (
                orders.map((o, idx) => {
                  const purchaseVal = o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || 0);
                  const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
                  const gstRate = o.gst || o.productId?.gst || 0;
                  const qtyVal = o.quantity || 1;
                  const courier = o.courierPartner || "Valmo";
                  const orderNumber = o.orderNo || "-";
                  const stateName = o.customerState || "Gujarat";
                  const profit = calculateOrderProfit(o);
                  
                  const formattedDate = new Date(o.date || o.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  });

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
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                        {orderNumber}
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                        {o.awbId || "-"}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "var(--text-primary)", fontSize: "13px" }}>
                        {o.productName || o.productId?.productName || "Unknown Product"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FaMapMarkerAlt style={{ color: "var(--text-muted)", fontSize: "11px" }} />
                          {stateName}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px", fontWeight: "500" }}>
                        ₹{purchaseVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px", fontWeight: "500" }}>
                        ₹{sellingVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px" }}>{qtyVal}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {gstRate}%
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)" }}>
                          <FaTruck style={{ fontSize: "11px", color: "var(--text-muted)" }} />
                          {courier}
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: "13px" }}>
                        <select 
                          value={o.paymentStatus || "Pending"} 
                          onChange={(e) => handleStatusChange(o._id, e.target.value)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            border: "1px solid var(--border-color)",
                            cursor: "pointer",
                            width: "120px",
                            backgroundColor: 
                              o.paymentStatus === "Complete" ? "rgba(16, 185, 129, 0.15)" :
                              o.paymentStatus === "Pending" ? "rgba(245, 158, 11, 0.15)" :
                              o.paymentStatus === "RTO Returned" ? "rgba(14, 165, 233, 0.15)" :
                              o.paymentStatus === "Return" ? "rgba(139, 92, 246, 0.15)" :
                              "rgba(239, 68, 68, 0.15)",
                            color:
                              o.paymentStatus === "Complete" ? "var(--success)" :
                              o.paymentStatus === "Pending" ? "var(--warning)" :
                              o.paymentStatus === "RTO Returned" ? "var(--info)" :
                              o.paymentStatus === "Return" ? "#a78bfa" :
                              "var(--danger)"
                          }}
                        >
                          <option value="Pending" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Pending</option>
                          <option value="Complete" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Complete</option>
                          <option value="RTO Returned" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>RTO Returned</option>
                          <option value="Cancel" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Cancel</option>
                          <option value="Return" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Return</option>
                        </select>
                      </td>
                      <td 
                        style={{ 
                          padding: "14px 16px", 
                          textAlign: "right", 
                          fontSize: "14px", 
                          fontWeight: "700", 
                          color: profit >= 0 ? "var(--success)" : "var(--danger)" 
                        }}
                      >
                        ₹{profit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <button 
                          onClick={() => handleDeleteRow(o._id)} 
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
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Excel-style Summary Row */}
              {orders.length > 0 && (
                <tr 
                  style={{ 
                    background: "rgba(99, 102, 241, 0.08)", 
                    fontWeight: "700", 
                    borderTop: "2px solid var(--primary)",
                    borderBottom: "2px solid var(--primary)" 
                  }}
                >
                  <td colSpan="5" style={{ padding: "16px", textTransform: "uppercase", fontSize: "12px", color: "var(--primary)", trackingSpacing: "1px" }}>
                    <FaFileInvoice /> Accounts Totals
                  </td>
                  <td style={{ padding: "16px", textAlign: "right", fontSize: "13px", color: "var(--text-primary)" }}>
                    ₹{stats.totalPurchase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "16px" }}></td>
                  <td style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--text-primary)" }}>
                    {stats.totalQty}
                  </td>
                  <td colSpan="3" style={{ padding: "16px" }}></td>
                  <td 
                    style={{ 
                      padding: "16px", 
                      textAlign: "right", 
                      fontSize: "15px", 
                      fontWeight: "800", 
                      color: stats.totalProfit >= 0 ? "var(--success)" : "var(--danger)" 
                    }}
                  >
                    ₹{stats.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "16px" }}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Ledger;
