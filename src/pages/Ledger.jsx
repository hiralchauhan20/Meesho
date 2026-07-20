import { useState, useEffect, useMemo } from "react";
import { FaPlus, FaTrash, FaEdit, FaTable, FaFileExport, FaCalendarAlt, FaTruck, FaMapMarkerAlt, FaFileInvoice, FaSearch, FaTimes, FaExclamationTriangle, FaCheckCircle, FaBoxes } from "react-icons/fa";


const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Jammu & Kashmir", "Other UT"
];

const calculateOrderProfit = (o) => {
  const paymentStatus = o.paymentStatus || "Pending";
  if (paymentStatus === "Pending" || paymentStatus === "RTO Returned") {
    return 0;
  }
  if (paymentStatus === "Cancel") {
    return -3;
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
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // Search / Filter states
  const [searchText, setSearchText] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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

  // Edit Form States
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editOrderNo, setEditOrderNo] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editCustomerState, setEditCustomerState] = useState("Gujarat");
  const [editPurchasePrice, setEditPurchasePrice] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editGst, setEditGst] = useState("18");
  const [editCourierPartner, setEditCourierPartner] = useState("Valmo");
  const [editAwbId, setEditAwbId] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("Pending");

  const startEdit = (o) => {
    setEditingOrder(o);
    setEditDate(new Date(o.date || o.createdAt).toISOString().slice(0, 10));
    setEditOrderNo(o.orderNo || "");
    setEditProductName(o.productName || o.productId?.productName || "");
    setEditCustomerState(o.customerState || "Gujarat");
    setEditPurchasePrice(o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || ""));
    setEditSellingPrice(o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || ""));
    setEditQuantity(o.quantity || "1");
    setEditGst(o.gst || o.productId?.gst || "18");
    setEditCourierPartner(o.courierPartner || "Valmo");
    setEditAwbId(o.awbId || "");
    setEditPaymentStatus(o.paymentStatus || "Pending");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editProductName.trim() || !editPurchasePrice || !editSellingPrice) {
      alert("Please fill in the Product Name, Purchase Price, and Selling Price.");
      return;
    }

    try {
      const payload = {
        orderNo: editOrderNo.trim(),
        awbId: editAwbId.trim(),
        customerState: editCustomerState,
        productName: editProductName.trim(),
        purchasePrice: Number(editPurchasePrice),
        sellingPrice: Number(editSellingPrice),
        quantity: Number(editQuantity),
        gst: Number(editGst),
        courierPartner: editCourierPartner,
        paymentStatus: editPaymentStatus,
        date: new Date(editDate).toISOString()
      };

      const res = await fetch(`/api/orders/${editingOrder._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update entry");

      setEditingOrder(null);
      fetchOrders();
      fetchStockSummary();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleProductNameChange = (value) => {
    setProductName(value);
    const lower = value.toLowerCase();
    
    // Autofill Buying Price based on matching rules
    if ((lower.includes("shapewear") || lower.includes("shapware")) && (lower.includes("pack of 2") || lower.includes("2 pack") || lower.includes("pack 2"))) {
      setPurchasePrice("145");
    } else if (lower.includes("shapewear") || lower.includes("shapware")) {
      setPurchasePrice("80");
    } else if (lower.includes("air bra") && (lower.includes("pack of 3") || lower.includes("3 pack") || lower.includes("pack 3"))) {
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
    fetchStockSummary();
  }, []);

  const fetchStockSummary = async () => {
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
  };

  const matchedStock = useMemo(() => {
    if (!productName.trim()) return null;
    const key = productName.trim().toLowerCase();
    return stocks.find(s => s.productName.toLowerCase() === key || s.productName.toLowerCase().includes(key));
  }, [productName, stocks]);

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

    const trimmedOrderNo = orderNo.trim();
    const trimmedAwbId = awbId.trim();

    // Check duplicate Order ID in current state
    if (trimmedOrderNo) {
      const dupOrder = orders.find(o => o.orderNo && o.orderNo.trim().toLowerCase() === trimmedOrderNo.toLowerCase());
      if (dupOrder) {
        alert(`❌ Duplicate Order ID: "${trimmedOrderNo}" is already logged! Duplicate Order IDs are not allowed.`);
        return;
      }
    }

    // Check duplicate Tracking ID in current state
    if (trimmedAwbId) {
      const dupAwb = orders.find(o => o.awbId && o.awbId.trim().toLowerCase() === trimmedAwbId.toLowerCase());
      if (dupAwb) {
        alert(`❌ Duplicate Tracking ID: "${trimmedAwbId}" is already logged! Duplicate Tracking IDs are not allowed.`);
        return;
      }
    }

    try {
      const payload = {
        orderNo: trimmedOrderNo,
        awbId: trimmedAwbId,
        customerState,
        productName: productName.trim(),
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        quantity: Number(quantity),
        shippingCost: 0, // Set to 0 since field is removed
        gst: Number(gst),
        courierPartner,
        paymentStatus: "Complete",
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

      if (!res.ok) {
        const errData = await res.json();
        alert(`❌ ${errData.message || "Failed to add entry to accounts"}`);
        return;
      }

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
      fetchStockSummary();
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
      fetchStockSummary();
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
      fetchStockSummary();
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
      const qtyVal = o.quantity || 1;
      
      const profit = calculateOrderProfit(o);
      const payStatus = o.paymentStatus || "Pending";
      
      totalQty += qtyVal;
      totalProfit += profit;
      if (payStatus === "Complete" || payStatus === "Pending") {
        totalPurchase += purchaseVal * qtyVal;
        totalSales += sellingVal * qtyVal;
      }
    });

    return { totalQty, totalPurchase, totalSales, totalProfit };
  };

  const stats = getLedgerStats();

  // Filtered orders based on search inputs
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Date filter
      if (filterDate) {
        const orderDate = new Date(o.date || o.createdAt).toISOString().slice(0, 10);
        if (orderDate !== filterDate) return false;
      }
      // Status filter
      if (filterStatus && (o.paymentStatus || "Pending") !== filterStatus) return false;
      // Text search (order no or product name)
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const name = (o.productName || o.productId?.productName || "").toLowerCase();
        const orderNo = (o.orderNo || "").toLowerCase();
        const awb = (o.awbId || "").toLowerCase();
        if (!name.includes(q) && !orderNo.includes(q) && !awb.includes(q)) return false;
      }
      return true;
    });
  }, [orders, filterDate, filterStatus, searchText]);

  // Stats for filtered results
  const filteredStats = useMemo(() => {
    let totalQty = 0, totalProfit = 0;
    filteredOrders.forEach((o) => {
      totalQty += o.quantity || 1;
      totalProfit += calculateOrderProfit(o);
    });
    return { totalQty, totalProfit };
  }, [filteredOrders]);

  const hasFilter = filterDate || filterStatus || searchText.trim();
  const clearFilters = () => { setSearchText(""); setFilterDate(""); setFilterStatus(""); };

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


      {/* Search & Filter Bar */}
      <div style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        {/* Text Search */}
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <FaSearch style={{ position: "absolute", left: "12px", top: "11px", color: "var(--text-muted)", fontSize: "13px" }} />
          <input
            type="text"
            placeholder="Search by Product Name, Order No, AWB..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: "100%", paddingLeft: "36px", height: "38px", fontSize: "13px" }}
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
          <option value="Cancel">Cancel</option>
          <option value="RTO Returned">RTO Returned</option>
          <option value="Return">Return</option>
        </select>

        {/* Clear Button */}
        {hasFilter && (
          <button
            onClick={clearFilters}
            style={{
              height: "38px", padding: "0 14px", borderRadius: "8px", fontSize: "13px",
              background: "rgba(239,68,68,0.1)", color: "var(--danger)",
              border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            <FaTimes /> Clear
          </button>
        )}

        {/* Summary Badge (Always Visible, no scrolling required) */}
        <div style={{
          marginLeft: "auto",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "6px 14px",
          fontSize: "13px",
          color: "var(--text-secondary)",
          fontWeight: "600",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)"
        }}>
          {hasFilter ? (
            <>
              <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Filtered</span>
              <span>Orders: <strong style={{ color: "var(--primary)" }}>{filteredOrders.length}</strong></span>
              <span>Qty: <strong style={{ color: "#f59e0b" }}>{filteredStats.totalQty}</strong></span>
              <span>Profit: <strong style={{ color: filteredStats.totalProfit >= 0 ? "var(--success)" : "var(--danger)" }}>₹{filteredStats.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </>
          ) : (
            <>
              <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Total</span>
              <span>Orders: <strong style={{ color: "var(--primary)" }}>{orders.length}</strong></span>
              <span>Qty: <strong style={{ color: "#f59e0b" }}>{stats.totalQty}</strong></span>
              <span>Profit: <strong style={{ color: stats.totalProfit >= 0 ? "var(--success)" : "var(--danger)" }}>₹{stats.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </>
          )}
        </div>
      </div>

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
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} required style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Order No. / ID</label>
              {orderNo.trim() && orders.some(o => o.orderNo && o.orderNo.trim().toLowerCase() === orderNo.trim().toLowerCase()) && (
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--danger)" }}>❌ Already Exists</span>
              )}
            </div>
            <input 
              type="text" 
              placeholder="e.g. 30880548..." 
              value={orderNo} 
              onChange={(e) => setOrderNo(e.target.value.replace(/[a-zA-Z]/g, ""))} 
              style={{ 
                width: "100%", 
                borderColor: orderNo.trim() && orders.some(o => o.orderNo && o.orderNo.trim().toLowerCase() === orderNo.trim().toLowerCase()) ? "var(--danger)" : undefined 
              }} 
            />
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Product Name</label>
              {matchedStock && (
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "2px 10px",
                  borderRadius: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: matchedStock.status === "OUT_OF_STOCK" ? "rgba(239, 68, 68, 0.15)" : matchedStock.status === "LOW_STOCK" ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
                  color: matchedStock.status === "OUT_OF_STOCK" ? "var(--danger)" : matchedStock.status === "LOW_STOCK" ? "#b45309" : "var(--success)",
                  border: matchedStock.status === "OUT_OF_STOCK" ? "1px solid rgba(239, 68, 68, 0.3)" : matchedStock.status === "LOW_STOCK" ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)"
                }}>
                  {matchedStock.status === "OUT_OF_STOCK" ? <FaExclamationTriangle /> : matchedStock.status === "LOW_STOCK" ? <FaExclamationTriangle /> : <FaCheckCircle />}
                  {matchedStock.status === "OUT_OF_STOCK" ? "OUT OF STOCK (0 left)" : matchedStock.status === "LOW_STOCK" ? `LOW STOCK (${matchedStock.remainingPcs} left)` : `IN STOCK (${matchedStock.remainingPcs} left)`}
                </span>
              )}
            </div>
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
              <option value="Megical Bra (Pack of 3)" />
              <option value="Megical Bra (Pack of 6)" />
              <option value="Shapewear" />
              <option value="Shapewear (Pack of 2)" />
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
            <input type="number" min="0.01" step="any" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: "100%" }} />
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>AWB ID / Tracking No.</label>
              {awbId.trim() && orders.some(o => o.awbId && o.awbId.trim().toLowerCase() === awbId.trim().toLowerCase()) && (
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--danger)" }}>❌ Already Exists</span>
              )}
            </div>
            <input 
              type="text" 
              placeholder="e.g. 1435252..." 
              value={awbId} 
              onChange={(e) => setAwbId(e.target.value)} 
              style={{ 
                width: "100%", 
                borderColor: awbId.trim() && orders.some(o => o.awbId && o.awbId.trim().toLowerCase() === awbId.trim().toLowerCase()) ? "var(--danger)" : undefined 
              }} 
            />
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px", fontSize: "14px" }}>
                    {orders.length === 0 ? "No transactions logged in your accounts. Insert a row above to get started." : "No orders match your search/filter. Try different criteria or clear filters."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o, idx) => {
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
                        <div style={{ display: "flex", justifyContent: "center", gap: "4px", alignItems: "center" }}>
                          <button 
                            type="button"
                            onClick={() => startEdit(o)}
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
                        </div>
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

      {/* Edit Sale Transaction Modal */}
      {editingOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Sale Transaction</h3>
              <button className="modal-close" onClick={() => setEditingOrder(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div>
                  <label>Date</label>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} required />
                </div>
                <div>
                  <label>Order No. / ID</label>
                  <input type="text" value={editOrderNo} onChange={(e) => setEditOrderNo(e.target.value.replace(/[a-zA-Z]/g, ""))} />
                </div>
                <div>
                  <label>Customer State</label>
                  <select value={editCustomerState} onChange={(e) => setEditCustomerState(e.target.value)}>
                    {INDIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Courier Partner</label>
                  <select value={editCourierPartner} onChange={(e) => setEditCourierPartner(e.target.value)}>
                    <option value="Valmo">Valmo</option>
                    <option value="Xpressbees">Xpressbees</option>
                    <option value="Shadowfax">Shadowfax</option>
                    <option value="Delhivery">Delhivery</option>
                    <option value="Ecom">Ecom</option>
                  </select>
                </div>
                <div className="form-full">
                  <label>Product Name</label>
                  <input 
                    type="text" 
                    value={editProductName} 
                    onChange={(e) => setEditProductName(e.target.value)} 
                    list="edit-product-suggestions"
                    required 
                  />
                  <datalist id="edit-product-suggestions">
                    <option value="Air Bra (Pack of 3)" />
                    <option value="Air Bra (Pack of 6)" />
                    <option value="Magical Bra (Pack of 3)" />
                    <option value="Magical Bra (Pack of 6)" />
                  </datalist>
                </div>
                <div>
                  <label>Buying Price (₹)</label>
                  <input type="number" min="0" value={editPurchasePrice} onChange={(e) => setEditPurchasePrice(e.target.value)} required />
                </div>
                <div>
                  <label>Selling Price (₹)</label>
                  <input type="number" min="0" value={editSellingPrice} onChange={(e) => setEditSellingPrice(e.target.value)} required />
                </div>
                <div>
                  <label>Quantity (Qty)</label>
                  <input type="number" min="0.01" step="any" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} required />
                </div>
                <div>
                  <label>GST Rate (%)</label>
                  <select value={editGst} onChange={(e) => setEditGst(e.target.value)}>
                    <option value="0">0% GST</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
                <div className="form-full">
                  <label>AWB ID / Tracking No.</label>
                  <input type="text" value={editAwbId} onChange={(e) => setEditAwbId(e.target.value)} />
                </div>
                <div className="form-full">
                  <label>Payment Status</label>
                  <select value={editPaymentStatus} onChange={(e) => setEditPaymentStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Complete">Complete</option>
                    <option value="RTO Returned">RTO Returned</option>
                    <option value="Cancel">Cancel</option>
                    <option value="Return">Return</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingOrder(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ledger;
