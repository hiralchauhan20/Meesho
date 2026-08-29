import { useState, useEffect, useMemo } from "react";
import { FaPlus, FaTrash, FaEdit, FaDownload, FaCoins, FaWallet, FaFileInvoiceDollar, FaChartLine, FaBoxOpen, FaExclamationTriangle, FaBoxes, FaCheckCircle, FaTruck, FaTimes } from "react-icons/fa";
import ConfirmModal from "../components/ConfirmModal";
import { API_URL } from "../config";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const calculateOrderProfit = (o) => {
  const paymentStatus = o.paymentStatus || "Pending";
  const claimAmt = o.claimAmount || 0;
  
  if (paymentStatus === "Pending") {
    return 0;
  }
  if (paymentStatus === "Cancel" || paymentStatus === "RTO Returned") {
    return -5;
  }
  
  if (paymentStatus === "Wrong Return") {
    if (o.claimStatus === "Approved") {
      return claimAmt;
    }
    return 0;
  }

  if (paymentStatus === "Return") {
    if (o.claimStatus === "Approved") {
      return -157 + claimAmt;
    }
    return -157;
  }
  
  const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
  const buyingVal = o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || 0);
  const gstRate = o.gst || o.productId?.gst || 0;
  const gstAmount = (sellingVal * gstRate) / 100;
  const qtyVal = o.quantity || 1;
  return (sellingVal - gstAmount - buyingVal) * qtyVal;
};

function Reports() {
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // Interactive Chart States
  const [activeMetric, setActiveMetric] = useState("income");
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);
  const [ignoreTrigger, setIgnoreTrigger] = useState(0);
  
  // Trend Cards View Mode States (Day-Wise vs Monthly)
  const [trendViewMode, setTrendViewMode] = useState("monthly"); // Default to monthly summary (yearly view)
  const [selectedMonth, setSelectedMonth] = useState("All");

  const trendMonth = selectedMonth === "All" ? new Date().getMonth() : Number(selectedMonth);

  const handleSetTrendViewMode = (mode) => {
    setTrendViewMode(mode);
    if (mode === "daily" && selectedMonth === "All") {
      setSelectedMonth(String(new Date().getMonth()));
    }
  };

  // Form states for extra expenses
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Packaging");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // Edit Form States
  const [editingExpense, setEditingExpense] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("Packaging");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");

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

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch expenses
      const expenseRes = await fetch(`${API_URL}/api/expenses`, { headers });
      if (!expenseRes.ok) throw new Error("Failed to fetch expenses");
      const expenseData = await expenseRes.json();
      setExpenses(expenseData);

      // Fetch orders (ledger transactions)
      const ordersRes = await fetch(`${API_URL}/api/orders`, { headers });
      if (!ordersRes.ok) throw new Error("Failed to fetch ledger transactions");
      const ordersData = await ordersRes.json();
      setOrders(ordersData);

      // Fetch investments
      const investmentRes = await fetch(`${API_URL}/api/investments`, { headers });
      if (!investmentRes.ok) throw new Error("Failed to fetch investments");
      const investmentData = await investmentRes.json();
      setInvestments(investmentData);

      // Fetch stock summary
      const stockRes = await fetch(`${API_URL}/api/investments/stock`, { headers });
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        setStocks(stockData);
      }
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

      const res = await fetch(`${API_URL}/api/expenses/add`, {
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
      showAlert(err.message, "Error");
    }
  };

  const handleDeleteExpense = (id) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false);
    if (!deleteId) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/expenses/${deleteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete expense");

      fetchFinancialData();
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setDeleteId(null);
    }
  };

  const startEditExpense = (exp) => {
    setEditingExpense(exp);
    setEditTitle(exp.title || "");
    setEditCategory(exp.category || "Packaging");
    setEditAmount(exp.amount ? exp.amount.toString() : "");
    setEditNote(exp.note || "");
    const formattedDate = new Date(exp.date || exp.createdAt).toISOString().slice(0, 10);
    setEditDate(formattedDate);
  };

  const handleEditExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editAmount || Number(editAmount) <= 0) {
      showAlert("Please enter a valid title and amount.", "Validation Error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        title: editTitle.trim(),
        category: editCategory,
        amount: Number(editAmount),
        date: new Date(editDate).toISOString(),
        note: editNote.trim()
      };

      const res = await fetch(`${API_URL}/api/expenses/${editingExpense._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update expense");

      setEditingExpense(null);
      fetchFinancialData();
    } catch (err) {
      showAlert(err.message, "Error");
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
          adsExpenses: 0,
          returnCost: 0,
          cancellationCost: 0,
          productCost: 0
        };
      }

      const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
      const gstRate = o.gst || o.productId?.gst || 0;
      const qtyVal = o.quantity || 1;
      const gstAmount = (sellingVal * gstRate) / 100;
      const payStatus = o.paymentStatus || "Pending";
      const claimAmt = o.claimAmount || 0;
      
      let orderGst = 0;
      let orderReturnCost = 0;
      let orderCancellationCost = 0;
      let orderProductCost = 0;
      
      if (payStatus === "Complete") {
        monthlyData[monthKey].sales += sellingVal * qtyVal;
        orderGst = gstAmount * qtyVal;
        orderProductCost = (o.purchasePrice || 0) * qtyVal;
      } else if (payStatus === "Cancel" || payStatus === "RTO Returned") {
        orderCancellationCost = 5;
      } else if (payStatus === "Return") {
        orderReturnCost = (o.claimStatus === "Approved") ? (157 - claimAmt) : 157;
      } else if (payStatus === "Wrong Return") {
        orderReturnCost = (o.claimStatus === "Approved") ? -claimAmt : 0;
      }
      
      monthlyData[monthKey].gst += orderGst;
      monthlyData[monthKey].productCost += orderProductCost;
      monthlyData[monthKey].returnCost += orderReturnCost;
      monthlyData[monthKey].cancellationCost += orderCancellationCost;
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
          adsExpenses: 0,
          returnCost: 0,
          cancellationCost: 0,
          productCost: 0
        };
      }

      if (e.category === "Advertising") {
        monthlyData[monthKey].adsExpenses += e.amount;
      } else {
        monthlyData[monthKey].otherExpenses += e.amount;
      }
    });

    // 3. Process investments (stock purchases)
    investments.forEach((inv) => {
      const dateObj = new Date(inv.date || inv.createdAt);
      const monthKey = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          sales: 0,
          purchases: 0,
          gst: 0,
          otherExpenses: 0,
          adsExpenses: 0,
          returnCost: 0,
          cancellationCost: 0,
          productCost: 0
        };
      }

      monthlyData[monthKey].purchases += inv.price || 0;
    });

    // Convert object to sorted array of months
    return Object.keys(monthlyData)
      .map((month) => {
        const item = monthlyData[month];
        const displaySales = item.sales - item.gst - (item.returnCost || 0) - (item.cancellationCost || 0);
        const totalInvestments = (item.purchases || 0) + (item.otherExpenses || 0) + (item.adsExpenses || 0);
        const netProfit = displaySales - totalInvestments;
        return {
          month,
          ...item,
          sales: displaySales,
          totalInvestments,
          netProfit
        };
      })
      .sort((a, b) => new Date(b.month) - new Date(a.month)); // Sort descending by date
  };

  const monthlyList = getMonthlyBreakdown();

  const filteredMonthlyList = useMemo(() => {
    return monthlyList.filter((m) => {
      const parts = m.month.split(" ");
      const year = Number(parts[parts.length - 1]);
      const isYearMatch = year === selectedYear;
      if (!isYearMatch) return false;

      if (selectedMonth !== "All") {
        const monthName = parts[0];
        // MONTHS array contains short names like "Jan", "Feb", but the key might be "January", "February"
        // Let's check how monthKey is formatted in getMonthlyBreakdown:
        // const monthKey = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" });
        // It uses "long" month name, e.g. "July 2026".
        // So parts[0] is e.g. "July".
        // Let's convert MONTHS index to a long month name or map it.
        // We can do:
        const longMonthName = new Date(2000, Number(selectedMonth), 1).toLocaleString("en-US", { month: "long" });
        return monthName === longMonthName;
      }
      return true;
    });
  }, [monthlyList, selectedYear, selectedMonth]);

  // Cumulative totals
  const getCumulativeTotals = () => {
    let sales = 0;
    let totalInvestments = 0;
    let netProfit = 0;
    let gst = 0;

    const targetMonths = filteredMonthlyList;

    targetMonths.forEach((m) => {
      sales += m.sales;
      totalInvestments += m.totalInvestments;
      netProfit += m.netProfit;
      gst += m.gst || 0;
    });

    return { 
      sales, 
      gst, 
      netProfit,
      totalInvestments 
    };
  };

  const totals = getCumulativeTotals();

  const claimStats = useMemo(() => {
    let totalClaims = 0;
    let pendingClaims = 0;
    let approvedClaims = 0;
    let rejectedClaims = 0;
    let approvedAmount = 0;

    orders.forEach((o) => {
      const d = new Date(o.date || o.createdAt);
      if (d.getFullYear() !== selectedYear) return;
      if (selectedMonth !== "All" && d.getMonth() !== Number(selectedMonth)) return;

      if (o.claimStatus && o.claimStatus !== "No Claim") {
        totalClaims++;
        if (o.claimStatus === "Pending") {
          pendingClaims++;
        } else if (o.claimStatus === "Approved") {
          approvedClaims++;
          approvedAmount += o.claimAmount || 0;
        } else if (o.claimStatus === "Rejected") {
          rejectedClaims++;
        }
      }
    });

    return { totalClaims, pendingClaims, approvedClaims, rejectedClaims, approvedAmount };
  }, [orders, selectedYear, selectedMonth]);

  const activeAlerts = useMemo(() => {
    let ignoredMap = {};
    try {
      ignoredMap = JSON.parse(localStorage.getItem("ignoredLowStock") || "{}");
    } catch (e) {
      ignoredMap = {};
    }

    return stocks.filter(s => {
      if (s.status !== "OUT_OF_STOCK" && s.status !== "LOW_STOCK") return false;
      const ignored = ignoredMap[s.productName];
      if (ignored) {
        if (s.remainingPcs === ignored.remainingPcs && s.totalSoldPcs === ignored.totalSoldPcs) {
          return false;
        }
      }
      return true;
    });
  }, [stocks, ignoreTrigger]);

  const handleIgnoreProduct = (productName, remainingPcs, totalSoldPcs) => {
    let ignoredMap = {};
    try {
      ignoredMap = JSON.parse(localStorage.getItem("ignoredLowStock") || "{}");
    } catch (e) {
      ignoredMap = {};
    }
    ignoredMap[productName] = { remainingPcs, totalSoldPcs };
    localStorage.setItem("ignoredLowStock", JSON.stringify(ignoredMap));
    setIgnoreTrigger(prev => prev + 1);
  };

  // ── Yearly chart data ──────────────────────────────────────────
  const getAvailableYears = () => {
    const years = new Set();
    const currentYear = new Date().getFullYear();
    // Add all years from 2020 to current year + 1
    for (let y = 2020; y <= currentYear + 1; y++) {
      years.add(y);
    }
    orders.forEach((o) => years.add(new Date(o.date || o.createdAt).getFullYear()));
    expenses.forEach((e) => years.add(new Date(e.date || e.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  };

  const getYearlyChartData = () => {
    const data = MONTHS.map((m) => ({
      month: m,
      profit: 0,
      orders: 0,
      income: 0, // sales revenue
      gst: 0,
      purchases: 0, // investments
      adsExpenses: 0,
      otherExpenses: 0,
      returnCost: 0,
      cancellationCost: 0,
      customerReturns: 0,
      rtoReturns: 0
    }));

    orders.forEach((o) => {
      const d = new Date(o.date || o.createdAt);
      if (d.getFullYear() === selectedYear) {
        const mIdx = d.getMonth();
        const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
        const gstRate = o.gst || o.productId?.gst || 0;
        const qtyVal = o.quantity || 1;
        const gstAmount = (sellingVal * gstRate) / 100;
        const payStatus = o.paymentStatus || "Pending";
        const claimAmt = o.claimAmount || 0;

        data[mIdx].orders += 1;

        if (payStatus === "Complete") {
          data[mIdx].income += sellingVal * qtyVal;
          data[mIdx].gst += gstAmount * qtyVal;
        } else if (payStatus === "Cancel" || payStatus === "RTO Returned") {
          data[mIdx].cancellationCost += 5;
        } else if (payStatus === "Return") {
          data[mIdx].returnCost += (o.claimStatus === "Approved" ? (157 - claimAmt) : 157);
        } else if (payStatus === "Wrong Return") {
          data[mIdx].returnCost += (o.claimStatus === "Approved" ? -claimAmt : 0);
        }

        if (payStatus === "Return" || payStatus === "Wrong Return") {
          data[mIdx].customerReturns += 1;
        } else if (payStatus === "RTO Returned") {
          data[mIdx].rtoReturns += 1;
        }
      }
    });

    expenses.forEach((e) => {
      const d = new Date(e.date || e.createdAt);
      if (d.getFullYear() === selectedYear) {
        const mIdx = d.getMonth();
        if (e.category === "Advertising") {
          data[mIdx].adsExpenses += e.amount;
        } else {
          data[mIdx].otherExpenses += e.amount;
        }
      }
    });

    investments.forEach((inv) => {
      const d = new Date(inv.date || inv.createdAt);
      if (d.getFullYear() === selectedYear) {
        const mIdx = d.getMonth();
        data[mIdx].purchases += inv.price || 0;
      }
    });

    // Calculate final profit for each month
    data.forEach((m) => {
      const netSales = m.income - m.gst - (m.returnCost || 0) - (m.cancellationCost || 0);
      const totalInvest = (m.purchases || 0) + (m.adsExpenses || 0) + (m.otherExpenses || 0);
      m.income = netSales;
      m.purchases = totalInvest;
      m.profit = netSales - totalInvest;
    });

    return data;
  };

  const chartData = getYearlyChartData();
  const yearTotal = chartData.reduce((s, d) => s + d.profit, 0);
  const yearOrders = chartData.reduce((s, d) => s + d.orders, 0);
  const yearIncome = chartData.reduce((s, d) => s + d.income, 0);
  const yearCustomerReturns = chartData.reduce((s, d) => s + d.customerReturns, 0);
  const yearRtoReturns = chartData.reduce((s, d) => s + d.rtoReturns, 0);

  // Day-wise chart data calculation
  const getDailyChartData = () => {
    const daysInMonth = new Date(selectedYear, trendMonth + 1, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      label: `${i + 1}`,
      dateLabel: `${MONTHS[trendMonth]} ${i + 1}`,
      profit: 0,
      orders: 0,
      income: 0,
      gst: 0,
      purchases: 0,
      adsExpenses: 0,
      otherExpenses: 0,
      returnCost: 0,
      cancellationCost: 0,
      customerReturns: 0,
      rtoReturns: 0
    }));

    orders.forEach((o) => {
      const d = new Date(o.date || o.createdAt);
      if (d.getFullYear() === selectedYear && d.getMonth() === trendMonth) {
        const dayIdx = d.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < daysInMonth) {
          const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
          const gstRate = o.gst || o.productId?.gst || 0;
          const qtyVal = o.quantity || 1;
          const gstAmount = (sellingVal * gstRate) / 100;
          const payStatus = o.paymentStatus || "Pending";
          const claimAmt = o.claimAmount || 0;

          data[dayIdx].orders += 1;

          if (payStatus === "Complete") {
            data[dayIdx].income += sellingVal * qtyVal;
            data[dayIdx].gst += gstAmount * qtyVal;
          } else if (payStatus === "Cancel" || payStatus === "RTO Returned") {
            data[dayIdx].cancellationCost += 5;
          } else if (payStatus === "Return") {
            data[dayIdx].returnCost += (o.claimStatus === "Approved" ? (157 - claimAmt) : 157);
          } else if (payStatus === "Wrong Return") {
            data[dayIdx].returnCost += (o.claimStatus === "Approved" ? -claimAmt : 0);
          }

          if (payStatus === "Return" || payStatus === "Wrong Return") {
            data[dayIdx].customerReturns += 1;
          } else if (payStatus === "RTO Returned") {
            data[dayIdx].rtoReturns += 1;
          }
        }
      }
    });

    expenses.forEach((e) => {
      const d = new Date(e.date || e.createdAt);
      if (d.getFullYear() === selectedYear && d.getMonth() === trendMonth) {
        const dayIdx = d.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < daysInMonth) {
          if (e.category === "Advertising") {
            data[dayIdx].adsExpenses += Number(e.amount) || 0;
          } else {
            data[dayIdx].otherExpenses += Number(e.amount) || 0;
          }
        }
      }
    });

    investments.forEach((inv) => {
      const d = new Date(inv.date || inv.createdAt);
      if (d.getFullYear() === selectedYear && d.getMonth() === trendMonth) {
        const dayIdx = d.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < daysInMonth) {
          data[dayIdx].purchases += Number(inv.price) || 0;
        }
      }
    });

    // Calculate final profit for each day
    data.forEach((d) => {
      const netSales = d.income - d.gst - (d.returnCost || 0) - (d.cancellationCost || 0);
      const totalInvest = (d.purchases || 0) + (d.adsExpenses || 0) + (d.otherExpenses || 0);
      d.income = netSales;
      d.purchases = totalInvest;
      d.profit = netSales - totalInvest;
    });

    return data;
  };

  const dailyData = getDailyChartData();
  const dailyTotalProfit = dailyData.reduce((s, d) => s + d.profit, 0);
  const dailyTotalOrders = dailyData.reduce((s, d) => s + d.orders, 0);
  const dailyTotalIncome = dailyData.reduce((s, d) => s + d.income, 0);
  const dailyTotalCustomerReturns = dailyData.reduce((s, d) => s + d.customerReturns, 0);
  const dailyTotalRtoReturns = dailyData.reduce((s, d) => s + d.rtoReturns, 0);

  const availableYears = getAvailableYears();

  // Metric configurations for line charts
  const METRIC_CONFIGS = {
    income: {
      label: "Income (Revenue)",
      color: "#10b981", // Green
      glow: "rgba(16, 185, 129, 0.4)",
      bgGrad: "url(#incomeGrad)",
      prefix: "₹",
    },
    profit: {
      label: "Net Profit",
      color: "#6366f1", // Indigo
      glow: "rgba(99, 102, 241, 0.4)",
      bgGrad: "url(#profitGrad)",
      prefix: "₹",
    },
    orders: {
      label: "Total Orders",
      color: "#0ea5e9", // Blue
      glow: "rgba(14, 165, 233, 0.4)",
      bgGrad: "url(#ordersGrad)",
      prefix: "",
    },
    customerReturns: {
      label: "Customer Returns",
      color: "#f59e0b", // Orange/Yellow
      glow: "rgba(245, 158, 11, 0.4)",
      bgGrad: "url(#returnsGrad)",
      prefix: "",
    },
    rtoReturns: {
      label: "RTO Returns",
      color: "#ec4899", // Pink
      glow: "rgba(236, 72, 153, 0.4)",
      bgGrad: "url(#rtoGrad)",
      prefix: "",
    }
  };

  const activeConfig = METRIC_CONFIGS[activeMetric];
  const activeValues = chartData.map((d) => d[activeMetric]);
  const minVal = activeMetric === "profit" ? Math.min(...activeValues, 0) : 0;
  const maxVal = Math.max(...activeValues, 1);
  const valRange = maxVal - minVal;
  
  const mainPoints = activeValues.map((val, i) => ({
    x: 80 + (i / 11) * 880,
    y: 270 - ((val - minVal) / valRange) * 230,
    val
  }));

  const mainLinePath = mainPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const mainAreaPath = `${mainLinePath} L${mainPoints[11].x},270 L${mainPoints[0].x},270 Z`;

  const yGridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const val = minVal + f * valRange;
    const y = 270 - f * 230;
    return { y, val };
  });

  const zeroY = activeMetric === "profit" && minVal < 0 ? 270 - ((0 - minVal) / valRange) * 230 : null;

  // Reusable Sparkline Generator for the 2x2 grid (Dynamic for Day-Wise / Monthly)
  const renderSparkline = (metric, color, isCurrency) => {
    const currentDataset = trendViewMode === "daily" ? dailyData : chartData;
    const values = currentDataset.map((d) => d[metric]);
    const min = metric === "profit" ? Math.min(...values, 0) : 0;
    const max = Math.max(...values, 1);
    const range = max - min;
    const count = values.length;
    const W = 360, H = 100, PAD_T = 10, PAD_B = 10, PAD_L = 10, PAD_R = 10;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;

    const points = values.map((val, i) => ({
      x: PAD_L + (i / (count - 1 || 1)) * innerW,
      y: PAD_T + innerH - (range > 0 ? ((val - min) / range) * innerH : 0),
    }));

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = `${linePath} L${points[count - 1].x},${PAD_T + innerH} L${points[0].x},${PAD_T + innerH} Z`;
    
    const gradId = `sparklineGrad-${metric}`;

    return (
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", marginTop: "10px" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {metric === "profit" && min < 0 && (
          <line
            x1={PAD_L}
            y1={PAD_T + innerH - (range > 0 ? ((0 - min) / range) * innerH : 0)}
            x2={W - PAD_R}
            y2={PAD_T + innerH - (range > 0 ? ((0 - min) / range) * innerH : 0)}
            stroke="rgba(239, 68, 68, 0.2)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        <path d={areaPath} fill={`url(#${gradId})`} />

        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={count > 20 ? 1.8 : 2.5} fill={color} />
          </g>
        ))}
      </svg>
    );
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Monthly Profit and Loss Statement - Seller Manager\n\n";
    csvContent += "Month,Total Sales (Revenue),Total Investments (₹) (Stock+Ads+Exp),GST Cost,Return Cost,Cancellation Cost,Net Profit/Loss\n";

    monthlyList.forEach((m) => {
      const totalInvest = (m.purchases || 0) + (m.adsExpenses || 0) + (m.otherExpenses || 0);
      csvContent += `"${m.month}",${m.sales.toFixed(2)},${totalInvest.toFixed(2)},${m.gst.toFixed(2)},${(m.returnCost || 0).toFixed(2)},${(m.cancellationCost || 0).toFixed(2)},${m.netProfit.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monthly_pl_${new Date().toISOString().slice(0, 10)}.csv`);
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

      {/* Inventory Stock Warning Widget */}
      {activeAlerts.length > 0 && (
        <div style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(12px)",
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          padding: "16px 20px",
          marginBottom: "20px",
          boxShadow: "var(--glass-shadow)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "280px" }}>
            <div style={{
              background: activeAlerts.some(s => s.status === "OUT_OF_STOCK") ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: activeAlerts.some(s => s.status === "OUT_OF_STOCK") ? "var(--danger)" : "#d97706",
              padding: "10px",
              borderRadius: "10px",
              display: "flex"
            }}>
              <FaExclamationTriangle style={{ fontSize: "20px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                Inventory Re-Stock Alert
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                {activeAlerts.map(s => (
                  <div key={s.productName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                      <strong>{s.productName}</strong>: <span style={{ color: s.status === "OUT_OF_STOCK" ? "var(--danger)" : "#f59e0b", fontWeight: "600" }}>{s.status === "OUT_OF_STOCK" ? "Out of Stock" : `Low Stock (${s.remainingPcs} pcs left)`}</span>
                    </span>
                    <button 
                      onClick={() => handleIgnoreProduct(s.productName, s.remainingPcs, s.totalSoldPcs)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-secondary)",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                      onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
                      onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.05)"}
                    >
                      Ignore Alert
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <a href="/investments" className="btn btn-secondary" style={{ fontSize: "12px", height: "34px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FaBoxes /> Manage Investments & Stock
          </a>
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
            <span className="stat-card-title">Total Investments</span>
            <div className="stat-card-icon"><FaWallet /></div>
          </div>
          <div className="stat-card-value">₹{totals.totalInvestments.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total stock, ads, and setup investment cost</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "var(--danger)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Total GST</span>
            <div className="stat-card-icon"><FaWallet /></div>
          </div>
          <div className="stat-card-value">₹{totals.gst.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total cumulative GST cost</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": totals.netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Net Profit</span>
            <div className="stat-card-icon"><FaFileInvoiceDollar /></div>
          </div>
          <div className="stat-card-value">₹{totals.netProfit.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Order revenue minus product, return, and cancellation costs</div>
        </div>
      </div>

      {/* Platform Claims Overview Cards */}
      <div style={{ marginTop: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "16px" }}>
          📊 Platform Claims Summary
        </h3>
        <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          <div className="stat-card" style={{ "--card-accent": "var(--primary)" }}>
            <div className="stat-card-header">
              <span className="stat-card-title">Claims Filed</span>
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
      </div>

      {/* ── Yearly Graph (Interactive Line Chart) ── */}
      <div style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "24px",
        boxShadow: "var(--glass-shadow)",
        position: "relative"
      }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
              📊 Performance Analytics Dashboard
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Detailed interactive monthly trends for {selectedYear}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ height: "36px", padding: "0 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", width: "auto" }}
            >
              {(availableYears.length > 0 ? availableYears : [new Date().getFullYear()]).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "8px", padding: "6px 14px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Year Orders</div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--success)" }}>{yearOrders}</div>
              </div>
              <div style={{
                background: yearTotal >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${yearTotal >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                borderRadius: "8px", padding: "6px 14px", textAlign: "center"
              }}>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Year Profit</div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: yearTotal >= 0 ? "var(--success)" : "var(--danger)" }}>
                  ₹{yearTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { id: "income", label: "Income", val: yearIncome, prefix: "₹", color: "#10b981" },
            { id: "profit", label: "Net Profit", val: yearTotal, prefix: "₹", color: "#6366f1" },
            { id: "orders", label: "Total Orders", val: yearOrders, prefix: "", color: "#0ea5e9" },
            { id: "customerReturns", label: "Customer Returns", val: yearCustomerReturns, prefix: "", color: "#f59e0b" },
            { id: "rtoReturns", label: "RTO Returns", val: yearRtoReturns, prefix: "", color: "#ec4899" }
          ].map((tab) => {
            const isActive = activeMetric === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMetric(tab.id)}
                type="button"
                style={{
                  background: isActive ? `rgba(${tab.id === 'income' ? '16,185,129' : tab.id === 'profit' ? '99,102,241' : tab.id === 'orders' ? '14,165,233' : tab.id === 'customerReturns' ? '245,158,11' : '236,72,153'}, 0.15)` : "rgba(255,255,255,0.02)",
                  border: isActive ? `1px solid ${tab.color}` : "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                  minWidth: "140px",
                  transition: "all var(--transition-fast)",
                  outline: "none"
                }}
              >
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "500" }}>{tab.label}</span>
                <span style={{ fontSize: "16px", fontWeight: "800", color: isActive ? tab.color : "var(--text-primary)" }}>
                  {tab.prefix}{tab.id === "profit" && tab.val < 0 ? "-" : ""}{Math.abs(tab.val).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Large SVG Line Chart */}
        <div style={{ overflowX: "auto", position: "relative" }}>
          <svg
            width="100%"
            height="320"
            viewBox="0 0 1000 320"
            style={{ display: "block", minWidth: "700px" }}
          >
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="returnsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="rtoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {yGridLines.map((gl, i) => (
              <g key={i}>
                <line
                  x1="80"
                  y1={gl.y}
                  x2="960"
                  y2={gl.y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
                <text
                  x="70"
                  y={gl.y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--text-muted)"
                  fontWeight="500"
                >
                  {activeConfig.prefix}{gl.val >= 0 ? "" : "-"}{Math.abs(gl.val) >= 100000 ? (Math.abs(gl.val) / 1000).toFixed(0) + "k" : Math.abs(gl.val).toLocaleString()}
                </text>
              </g>
            ))}

            {/* Zero line indicator for Net Profit */}
            {zeroY !== null && (
              <line
                x1="80"
                y1={zeroY}
                x2="960"
                y2={zeroY}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.4"
              />
            )}

            {/* Area Path */}
            <path
              d={mainAreaPath}
              fill={activeConfig.bgGrad}
            />

            {/* Trend Line */}
            <path
              d={mainLinePath}
              fill="none"
              stroke={activeConfig.color}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Static X-Axis Labels */}
            {MONTHS.map((m, i) => (
              <text
                key={i}
                x={80 + (i / 11) * 880}
                y="295"
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-secondary)"
                fontWeight="600"
              >
                {m}
              </text>
            ))}

            {/* Hover Guides and Markers */}
            {hoveredMonthIndex !== null && (
              <g>
                <line
                  x1={mainPoints[hoveredMonthIndex].x}
                  y1="40"
                  x2={mainPoints[hoveredMonthIndex].x}
                  y2="270"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={mainPoints[hoveredMonthIndex].x}
                  cy={mainPoints[hoveredMonthIndex].y}
                  r="8"
                  fill={activeConfig.color}
                  opacity="0.4"
                />
                <circle
                  cx={mainPoints[hoveredMonthIndex].x}
                  cy={mainPoints[hoveredMonthIndex].y}
                  r="5"
                  fill={activeConfig.color}
                />
                <circle
                  cx={mainPoints[hoveredMonthIndex].x}
                  cy={mainPoints[hoveredMonthIndex].y}
                  r="2.5"
                  fill="#ffffff"
                />
              </g>
            )}

            {/* Transparent Hover Interactivity Rectangles */}
            {MONTHS.map((_, i) => {
              const x = 80 + (i / 11) * 880;
              const width = 880 / 11;
              return (
                <rect
                  key={i}
                  x={x - width / 2}
                  y="20"
                  width={width}
                  height="260"
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredMonthIndex(i)}
                  onMouseLeave={() => setHoveredMonthIndex(null)}
                />
              );
            })}
          </svg>

          {/* HTML Overlay Tooltip */}
          {hoveredMonthIndex !== null && (
            <div
              style={{
                position: "absolute",
                left: `${80 + (hoveredMonthIndex / 11) * 880 + 15}px`,
                top: `${Math.min(mainPoints[hoveredMonthIndex].y, 140)}px`,
                transform: hoveredMonthIndex > 8 ? "translateX(-230px)" : "none",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "14px",
                boxShadow: "var(--glass-shadow)",
                pointerEvents: "none",
                zIndex: 10,
                minWidth: "200px",
                transition: "left-margin 0.08s ease-out"
              }}
            >
              <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "8px", color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: "4px" }}>
                {chartData[hoveredMonthIndex].month} {selectedYear}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Income:</span>
                  <span style={{ fontWeight: "600", color: "#10b981" }}>₹{chartData[hoveredMonthIndex].income.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Net Profit:</span>
                  <span style={{ fontWeight: "600", color: chartData[hoveredMonthIndex].profit >= 0 ? "#10b981" : "#ef4444" }}>
                    {chartData[hoveredMonthIndex].profit >= 0 ? "" : "-"}₹{Math.abs(chartData[hoveredMonthIndex].profit).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Total Orders:</span>
                  <span style={{ fontWeight: "600", color: "#0ea5e9" }}>{chartData[hoveredMonthIndex].orders}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Customer Returns:</span>
                  <span style={{ fontWeight: "600", color: "#f59e0b" }}>{chartData[hoveredMonthIndex].customerReturns}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>RTO Returns:</span>
                  <span style={{ fontWeight: "600", color: "#ec4899" }}>{chartData[hoveredMonthIndex].rtoReturns}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2x2 Grid Header & View Mode Switch (Day-Wise vs Monthly) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "30px", marginBottom: "15px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>📊 Performance Trend Cards</h3>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
            {trendViewMode === "daily" ? `Day-wise (Daily) trend view for ${MONTHS[trendMonth]} ${selectedYear}` : `Monthly trend view for ${selectedYear}`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)" }}>Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  height: "36px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                {trendViewMode === "monthly" && (
                  <option value="All">All Months</option>
                )}
                {MONTHS.map((m, idx) => (
                  <option key={m} value={String(idx)}>{m}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)" }}>Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  height: "36px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer"
                }}
              >
                {(availableYears.length > 0 ? availableYears : [new Date().getFullYear()]).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle buttons for Day-wise vs Monthly */}
          <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <button
              type="button"
              onClick={() => handleSetTrendViewMode("daily")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "700",
                border: "none",
                cursor: "pointer",
                background: trendViewMode === "daily" ? "var(--primary)" : "transparent",
                color: trendViewMode === "daily" ? "#fff" : "var(--text-secondary)",
                transition: "all 0.2s"
              }}
            >
              📅 Day-Wise (Daily)
            </button>
            <button
              type="button"
              onClick={() => handleSetTrendViewMode("monthly")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "700",
                border: "none",
                cursor: "pointer",
                background: trendViewMode === "monthly" ? "var(--primary)" : "transparent",
                color: trendViewMode === "monthly" ? "#fff" : "var(--text-secondary)",
                transition: "all 0.2s"
              }}
            >
              📆 Monthly Wise
            </button>
          </div>
        </div>
      </div>

      {/* ── 2x2 Grid of Detailed Line Charts (Day-Wise / Monthly) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* Income Line Graph Card */}
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", boxShadow: "var(--glass-shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>📈 Income (Revenue) Trend</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "3px 0 0" }}>
                {trendViewMode === "daily" ? `Daily sales (${MONTHS[trendMonth]})` : "Monthly sales performance"}
              </p>
            </div>
            <div style={{ fontSize: "16px", color: "#10b981" }}><FaCoins /></div>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#10b981", marginBottom: "10px" }}>
            ₹{(trendViewMode === "daily" ? dailyTotalIncome : yearIncome).toLocaleString()}
          </div>
          {renderSparkline("income", "#10b981", true)}
        </div>

        {/* Net Profit Line Graph Card */}
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", boxShadow: "var(--glass-shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>📊 Net Profit/Loss Trend</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "3px 0 0" }}>
                {trendViewMode === "daily" ? `Daily profit (${MONTHS[trendMonth]})` : "Take-home profit minus expenses"}
              </p>
            </div>
            <div style={{ fontSize: "16px", color: "#6366f1" }}><FaChartLine /></div>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: (trendViewMode === "daily" ? dailyTotalProfit : yearTotal) >= 0 ? "#10b981" : "#ef4444", marginBottom: "10px" }}>
            {(trendViewMode === "daily" ? dailyTotalProfit : yearTotal) >= 0 ? "₹" : "-₹"}{Math.abs(trendViewMode === "daily" ? dailyTotalProfit : yearTotal).toLocaleString()}
          </div>
          {renderSparkline("profit", "#6366f1", true)}
        </div>

        {/* Total Orders Line Graph Card */}
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", boxShadow: "var(--glass-shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>📦 Total Orders Trend</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "3px 0 0" }}>
                {trendViewMode === "daily" ? `Daily orders (${MONTHS[trendMonth]})` : "Volume of monthly shipments"}
              </p>
            </div>
            <div style={{ fontSize: "16px", color: "#0ea5e9" }}><FaBoxOpen /></div>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#0ea5e9", marginBottom: "10px" }}>
            {(trendViewMode === "daily" ? dailyTotalOrders : yearOrders).toLocaleString()} orders
          </div>
          {renderSparkline("orders", "#0ea5e9", false)}
        </div>

        {/* Customer Returns Line Graph Card */}
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", boxShadow: "var(--glass-shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>🔄 Customer Returns Trend</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "3px 0 0" }}>
                {trendViewMode === "daily" ? `Daily customer returns (${MONTHS[trendMonth]})` : "Volume of customer returns"}
              </p>
            </div>
            <div style={{ fontSize: "16px", color: "#f59e0b" }}><FaFileInvoiceDollar /></div>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#f59e0b", marginBottom: "10px" }}>
            {(trendViewMode === "daily" ? dailyTotalCustomerReturns : yearCustomerReturns).toLocaleString()} returns
          </div>
          {renderSparkline("customerReturns", "#f59e0b", false)}
        </div>

        {/* RTO Returns Line Graph Card */}
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", boxShadow: "var(--glass-shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>🔄 RTO Returns Trend</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "3px 0 0" }}>
                {trendViewMode === "daily" ? `Daily RTO returns (${MONTHS[trendMonth]})` : "Volume of RTO returns"}
              </p>
            </div>
            <div style={{ fontSize: "16px", color: "#ec4899" }}><FaTruck /></div>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#ec4899", marginBottom: "10px" }}>
            {(trendViewMode === "daily" ? dailyTotalRtoReturns : yearRtoReturns).toLocaleString()} RTOs
          </div>
          {renderSparkline("rtoReturns", "#ec4899", false)}
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
                    <th>Total Investments (₹)</th>
                    <th>GST Cost (₹)</th>
                    <th>Return Cost (₹)</th>
                    <th>Cancel Cost (₹)</th>
                    <th>Net Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonthlyList.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
                        No ledger entries found for {selectedYear}. Record sales in the Sales Ledger tab first!
                      </td>
                    </tr>
                  ) : (
                    filteredMonthlyList.map((m, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: "700", color: "var(--text-primary)" }}>{m.month}</td>
                        <td>₹{m.sales.toLocaleString()}</td>
                        <td>₹{((m.purchases || 0) + (m.adsExpenses || 0) + (m.otherExpenses || 0)).toLocaleString()}</td>
                        <td>₹{m.gst.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td>₹{(m.returnCost || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td>₹{(m.cancellationCost || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
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
              {expenses.filter(e => e.category !== "Advertising").length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px", fontSize: "13px" }}>
                  No extra expenses registered.
                </div>
              ) : (
                expenses.filter(e => e.category !== "Advertising").map((exp) => (
                  <div key={exp._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "13px" }}>{exp.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {exp.category} | {new Date(exp.date || exp.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <button 
                        onClick={() => startEditExpense(exp)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center" }}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => handleDeleteExpense(exp._id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center" }}
                        title="Delete"
                      >
                        &times;
                      </button>
                      <span style={{ color: "var(--danger)", fontWeight: "600", fontSize: "13px", marginLeft: "4px" }}>
                        -₹{exp.amount.toLocaleString()}
                      </span>
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

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Extra Expense</h3>
              <button className="modal-close" onClick={() => setEditingExpense(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditExpenseSubmit}>
              <div className="form-grid">
                <div className="form-full">
                  <label>Expense Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required placeholder="e.g. Packing Tapes" />
                </div>
                <div>
                  <label>Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                    <option value="Packaging">Packaging</option>
                    <option value="Office Rent">Office Rent</option>
                    <option value="Advertising">Advertising</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label>Amount (₹)</label>
                  <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required />
                </div>
                <div className="form-full">
                  <label>Date</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)} 
                    max={new Date().toISOString().slice(0, 10)}
                    required 
                  />
                </div>
                <div className="form-full">
                  <label>Notes (Optional)</label>
                  <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows="3" placeholder="Describe the operational cost..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingExpense(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation and Alert Modals */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Expense Log"
        message="Are you sure you want to delete this expense log? This action cannot be undone."
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

export default Reports;
