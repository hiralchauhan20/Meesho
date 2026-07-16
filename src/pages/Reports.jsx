import { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaDownload, FaCoins, FaWallet, FaFileInvoiceDollar, FaChartLine } from "react-icons/fa";

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

function Reports() {
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Form states for extra expenses
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Packaging");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch expenses
      const expenseRes = await fetch("/api/expenses", { headers });
      if (!expenseRes.ok) throw new Error("Failed to fetch expenses");
      const expenseData = await expenseRes.json();
      setExpenses(expenseData);

      // Fetch orders (ledger transactions)
      const ordersRes = await fetch("/api/orders", { headers });
      if (!ordersRes.ok) throw new Error("Failed to fetch ledger transactions");
      const ordersData = await ordersRes.json();
      setOrders(ordersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        title,
        category,
        amount: Number(amount),
        note
      };

      const res = await fetch("/api/expenses/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to add expense");

      setShowAddExpense(false);
      setTitle("");
      setAmount("");
      setNote("");
      
      fetchFinancialData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense log?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete expense");

      fetchFinancialData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Group transactions (Orders) and Expenses by Month
  const getMonthlyBreakdown = () => {
    const monthlyData = {};

    // 1. Process ledger orders
    orders.forEach((o) => {
      const dateObj = new Date(o.date || o.createdAt);
      const monthKey = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" }); // e.g., "July 2026"
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          sales: 0,
          purchases: 0,
          gst: 0,
          otherExpenses: 0,
          orderProfit: 0
        };
      }

      const purchaseVal = o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || 0);
      const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
      const gstRate = o.gst || o.productId?.gst || 0;
      const qtyVal = o.quantity || 1;
      const payStatus = o.paymentStatus || "Pending";

      const gstAmount = (sellingVal * gstRate) / 100;
      const profit = calculateOrderProfit(o);
      
      monthlyData[monthKey].orderProfit += profit;
      
      if (payStatus === "Complete") {
        monthlyData[monthKey].sales += sellingVal * qtyVal;
        monthlyData[monthKey].purchases += purchaseVal * qtyVal;
        monthlyData[monthKey].gst += gstAmount * qtyVal;
      }
    });

    // 2. Process extra expenses
    expenses.forEach((e) => {
      const dateObj = new Date(e.date || e.createdAt);
      const monthKey = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          sales: 0,
          purchases: 0,
          gst: 0,
          otherExpenses: 0,
          orderProfit: 0
        };
      }

      monthlyData[monthKey].otherExpenses += e.amount;
    });

    // Convert object to sorted array of months
    return Object.keys(monthlyData)
      .map((month) => {
        const item = monthlyData[month];
        const totalCost = item.purchases + item.gst + item.otherExpenses;
        const netProfit = item.orderProfit - item.otherExpenses;
        return {
          month,
          ...item,
          totalCost,
          netProfit
        };
      })
      .sort((a, b) => new Date(b.month) - new Date(a.month)); // Sort descending by date
  };

  const monthlyList = getMonthlyBreakdown();

  // Cumulative totals
  const getCumulativeTotals = () => {
    let sales = 0;
    let purchases = 0;
    let gst = 0;
    let otherExpenses = 0;

    monthlyList.forEach((m) => {
      sales += m.sales;
      purchases += m.purchases;
      gst += m.gst;
      otherExpenses += m.otherExpenses;
    });

    const netProfit = sales - (purchases + gst + otherExpenses);

    return { sales, purchases, gst, otherExpenses, netProfit };
  };

  const totals = getCumulativeTotals();

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Monthly Profit and Loss Statement - Meesho Manager\n\n";
    csvContent += "Month,Total Sales (Revenue),Purchase Cost (COGS),GST Cost,Other Expenses,Net Profit/Loss\n";

    monthlyList.forEach((m) => {
      csvContent += `"${m.month}",${m.sales.toFixed(2)},${m.purchases.toFixed(2)},${m.gst.toFixed(2)},${m.otherExpenses.toFixed(2)},${m.netProfit.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `meesho_monthly_pl_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Monthly Profit & Loss</h2>
          <p>Analyze your sales performance, COGS, shipping, and extra operational expenses month-by-month</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-secondary" onClick={exportCSV} style={{ gap: "8px" }}>
            <FaDownload /> Download P&L
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddExpense(true)} style={{ gap: "8px" }}>
            <FaPlus /> Log Expense
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px", backgroundColor: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)", borderRadius: "var(--border-radius-sm)", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Cumulative Stats Cards */}
      <div className="cards" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat-card" style={{ "--card-accent": "var(--success)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Total Sales</span>
            <div className="stat-card-icon"><FaCoins /></div>
          </div>
          <div className="stat-card-value">₹{totals.sales.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total sheet orders revenue</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--warning)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Purchase Cost (COGS)</span>
            <div className="stat-card-icon"><FaWallet /></div>
          </div>
          <div className="stat-card-value">₹{totals.purchases.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total inventory buying cost</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--danger)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Total GST</span>
            <div className="stat-card-icon"><FaWallet /></div>
          </div>
          <div className="stat-card-value">₹{totals.gst.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total cumulative GST cost</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": totals.netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Net Profit</span>
            <div className="stat-card-icon"><FaFileInvoiceDollar /></div>
          </div>
          <div className="stat-card-value">₹{totals.netProfit.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Revenue minus all expenses</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr", gap: "24px", marginTop: "30px" }}>
        
        {/* Monthly Breakdown Grid */}
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-md)", padding: "24px", boxShadow: "var(--glass-shadow)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <FaChartLine style={{ color: "var(--primary)" }} /> Monthly P&L Accounts
          </h3>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>Calculating monthly P&L...</div>
          ) : (
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Sales (₹)</th>
                    <th>Purchases (₹)</th>
                    <th>GST Cost (₹)</th>
                    <th>Other Exp (₹)</th>
                    <th>Net Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyList.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
                        No ledger entries found. Record sales in the Sales Ledger tab first!
                      </td>
                    </tr>
                  ) : (
                    monthlyList.map((m, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: "700", color: "var(--text-primary)" }}>{m.month}</td>
                        <td>₹{m.sales.toLocaleString()}</td>
                        <td>₹{m.purchases.toLocaleString()}</td>
                        <td>₹{m.gst.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td>₹{m.otherExpenses.toLocaleString()}</td>
                        <td style={{ fontWeight: "800", fontSize: "15px", color: m.netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
                          ₹{m.netProfit.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Extra Expenses Panel */}
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-md)", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600" }}>Extra Expenses Log</h3>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>Loading expenses...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "350px", overflowY: "auto" }}>
              {expenses.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px", fontSize: "13px" }}>
                  No extra expenses registered.
                </div>
              ) : (
                expenses.map((exp) => (
                  <div key={exp._id} style={{ display: "flex", justify: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "13px" }}>{exp.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {exp.category} | {new Date(exp.date || exp.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "var(--danger)", fontWeight: "600", fontSize: "13px" }}>
                        -₹{exp.amount.toLocaleString()}
                      </span>
                      <button 
                        onClick={() => handleDeleteExpense(exp._id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px" }}
                        title="Delete"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* Log Expense Modal */}
      {showAddExpense && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Log Extra Expense</h3>
              <button className="modal-close" onClick={() => setShowAddExpense(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="form-grid">
                <div className="form-full">
                  <label>Expense Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Packing Tapes" />
                </div>
                <div>
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Packaging">Packaging</option>
                    <option value="Office Rent">Office Rent</option>
                    <option value="Advertising">Advertising</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label>Amount (₹)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="form-full">
                  <label>Notes (Optional)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" placeholder="Describe the operational cost..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddExpense(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
