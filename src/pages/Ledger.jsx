import { useState, useEffect, useMemo, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import { FaPlus, FaTrash, FaEdit, FaTable, FaFileExport, FaCalendarAlt, FaTruck, FaMapMarkerAlt, FaFileInvoice, FaSearch, FaTimes, FaExclamationTriangle, FaCheckCircle, FaBoxes, FaStore, FaTag } from "react-icons/fa";
import ConfirmModal from "../components/ConfirmModal";
import { API_URL } from "../config";
import { getPlatformStyle } from "./Shops";

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Jammu & Kashmir", "Other UT"
];

const FILTER_PRODUCTS = [
  "Air Bra (Pack of 3)",
  "Air Bra (Pack of 6)",
  "Megical Bra (Pack of 3)",
  "Megical Bra (Pack of 6)",
  "Shapewear Black",
  "Shapewear Black (Pack of 2)",
  "Shapewear Cream",
  "Shapewear Cream (Pack of 2)",
  "Shapewear Black and Cream (Pack of 2)"
];

// No lock restriction - user can change payment status or edit/delete orders anytime
const isOrderLocked = () => false;

const calculateOrderProfit = (o) => {
  const paymentStatus = o.paymentStatus || "Pending";
  const claimAmt = o.claimAmount || 0;
  if (paymentStatus === "Pending") {
    return 0;
  }
  if (paymentStatus === "Cancel" || paymentStatus === "RTO Returned") {
    return -5;
  }
  
  const purchaseVal = o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || 0);
  const qtyVal = o.quantity || 1;
  const totalPurchaseCost = purchaseVal * qtyVal;

  if (paymentStatus === "Wrong Return") {
    if (o.claimStatus === "Approved") {
      return claimAmt - totalPurchaseCost;
    }
    return -totalPurchaseCost;
  }
  if (paymentStatus === "Return") {
    if (o.claimStatus === "Approved") {
      return -157 + claimAmt;
    }
    return -157;
  }
  
  // Complete state: calculate profit normally
  const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
  const gstRate = o.gst || o.productId?.gst || 0;
  const gstAmount = (sellingVal * gstRate) / 100;
  return (sellingVal - purchaseVal - gstAmount) * qtyVal;
};



function Ledger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialShopParam = searchParams.get("shop") || "All";

  const [orders, setOrders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search / Filter states
  const [filterShop, setFilterShop] = useState(initialShopParam);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCourier, setFilterCourier] = useState("");
  const [filterCustomerState, setFilterCustomerState] = useState("");
  const [filterOrderNo, setFilterOrderNo] = useState("");

  // Form states for fast entry
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // Default today
  const [shopName, setShopName] = useState("HKC Collection");
  const [shopPlatform, setShopPlatform] = useState("Meesho");
  const [orderNo, setOrderNo] = useState(""); // Order ID
  const [productId, setProductId] = useState(""); // Selected Product ID
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
  const [editShopName, setEditShopName] = useState("HKC Collection");
  const [editShopPlatform, setEditShopPlatform] = useState("Meesho");
  const [editDate, setEditDate] = useState("");
  const [editOrderNo, setEditOrderNo] = useState("");
  const [editProductId, setEditProductId] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editCustomerState, setEditCustomerState] = useState("Gujarat");
  const [editPurchasePrice, setEditPurchasePrice] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editGst, setEditGst] = useState("18");
  const [editCourierPartner, setEditCourierPartner] = useState("Valmo");
  const [editAwbId, setEditAwbId] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("Pending");
  const [editDispatchStatus, setEditDispatchStatus] = useState("Pending");
  const [editClaimStatus, setEditClaimStatus] = useState("No Claim");
  const [editClaimAmount, setEditClaimAmount] = useState("0");

  // Custom Modal States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("Alert");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (message, title = "Notice") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  // PDF Parsing states
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");
  const [pdfSelectedShop, setPdfSelectedShop] = useState("HKC Collection");
  const [parsedOrders, setParsedOrders] = useState([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [expandedRawText, setExpandedRawText] = useState(null);
  // Helper matching functions for PDF Label Import
  const autoMatchProduct = (text, productsList) => {
    if (!productsList || productsList.length === 0) return null;
    
    const pageLower = text.toLowerCase();
    let bestProduct = null;
    let bestScore = 0;
    
    for (const p of productsList) {
      const nameLower = p.productName.toLowerCase();
      
      // 1. Direct exact or normalized check first
      const normName = nameLower.replace(/[^a-z0-9]/g, "");
      const normPage = pageLower.replace(/[^a-z0-9]/g, "");
      if (normPage.includes(normName)) {
        return p;
      }
      
      // 2. Token overlap score
      const stopWords = ["of", "and", "or", "in", "with", "for", "the", "a", "an", "pack", "pk", "pcs", "pc"];
      const tokens = nameLower
        .split(/[^a-z0-9]+/)
        .filter(t => t.length > 0 && !stopWords.includes(t));
        
      if (tokens.length === 0) continue;
      
      let matchedCount = 0;
      for (const token of tokens) {
        if (pageLower.includes(token)) {
          matchedCount++;
        }
      }
      
      const score = matchedCount / tokens.length;
      
      // 3. Exact quantity mismatch checks (e.g. 3 vs 6)
      const numbersInCatalog = nameLower.match(/\b\d+\b/g) || [];
      let numberMismatch = false;
      for (const num of numbersInCatalog) {
        const pageNumbers = pageLower.match(/\b\d+\b/g) || [];
        if (!pageNumbers.includes(num)) {
          numberMismatch = true;
          break;
        }
      }
      
      if (numberMismatch) {
        continue;
      }
      
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestProduct = p;
      }
    }
    
    return bestProduct;
  };

  const extractCourierPartner = (text) => {
    const t = text.toLowerCase().replace(/\s+/g, "");
    if (t.includes("delhivery")) return "Delhivery";
    if (t.includes("shadowfax")) return "Shadowfax";
    if (t.includes("xpressbees") || t.includes("expressbees")) return "Xpressbees";
    if (t.includes("ecomexpress") || t.includes("ecom")) return "Ecom";
    if (t.includes("valmo")) return "Valmo";
    return "Valmo";
  };

  const extractCustomerState = (text, statesList) => {
    const t = text.toLowerCase().replace(/[^a-z]/g, "");
    
    // Find all states mentioned in the text
    const matchedStates = [];
    for (const s of statesList) {
      const stateLower = s.toLowerCase();
      const normState = stateLower.replace(/[^a-z]/g, "");
      if (t.includes(normState)) {
        matchedStates.push(s);
      }
    }

    // If there is any state other than Gujarat, that is the customer's state!
    const nonGujarat = matchedStates.filter(s => s !== "Gujarat");
    if (nonGujarat.length > 0) {
      return nonGujarat[0];
    }

    // If only Gujarat is matched, or if no state is matched (fallback to Gujarat if no other state)
    if (matchedStates.includes("Gujarat")) {
      return "Gujarat";
    }

    const abbrevs = {
      "gj": "Gujarat",
      "mh": "Maharashtra",
      "rj": "Rajasthan",
      "up": "Uttar Pradesh",
      "dl": "Delhi",
      "mp": "Madhya Pradesh",
      "ka": "Karnataka",
      "tn": "Tamil Nadu",
      "wb": "West Bengal",
      "ap": "Andhra Pradesh",
      "ts": "Telangana",
      "hr": "Haryana",
      "pb": "Punjab",
      "br": "Bihar",
      "jh": "Jharkhand",
      "ct": "Chhattisgarh",
      "or": "Odisha",
      "kl": "Kerala",
      "as": "Assam",
      "jk": "Jammu & Kashmir",
      "ut": "Uttarakhand",
      "hp": "Himachal Pradesh",
      "goa": "Goa"
    };
    
    const stateCodeMatch = text.match(/state\s*(?:code)?\s*[:\-\s]*\b([a-zA-Z]{2})\b/i);
    if (stateCodeMatch && stateCodeMatch[1]) {
      const code = stateCodeMatch[1].toLowerCase();
      if (abbrevs[code]) {
        return abbrevs[code];
      }
    }
    
    return "Gujarat";
  };

  const extractOrderNo = (text) => {
    const cleanText = text.replace(/\s+/g, "");

    // Helper to ensure _1 is appended if missing
    const ensureSuffix = (val) => {
      if (!val) return "";
      return val.includes("_") ? val : `${val}_1`;
    };

    // 1. Search for any 18-digit number with optional underscore suffix (typical Meesho format)
    // We do this first because it is extremely specific and unique to Meesho orders, preventing
    // collisions and greedy matching errors.
    const match18 = cleanText.match(/(\d{18}(?:_\d+)?)/);
    if (match18) return ensureSuffix(match18[1]);
    
    // 2. Try matching with keywords in normalized text (no spaces)
    const patterns = [
      /purchaseorderno\.?[:\s\-]*([0-9_\-\/]+)/i,
      /orderno\.?[:\s\-]*([0-9_\-\/]+)/i,
      /orderid[:\s\-]*([0-9_\-\/]+)/i,
      /order[:\s\-]*([0-9_\-\/]+)/i
    ];
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        if (match[1].length >= 12) return ensureSuffix(match[1]);
      }
    }

    // 3. Fallback to normal text checks
    const patternsNormal = [
      /purchase\s*order\s*no\.?\s*[:\s\-]*([0-9_\-\/]+)/i,
      /order\s*no\.?\s*[:\s\-]*([0-9_\-\/]+)/i,
      /order\s*id\s*[:\s\-]*([0-9_\-\/]+)/i,
      /order\s*[:\s\-]*([0-9_\-\/]+)/i
    ];
    for (const pattern of patternsNormal) {
      const match = text.match(pattern);
      if (match && match[1]) {
        if (match[1].length >= 12) return ensureSuffix(match[1]);
      }
    }

    // 4. Fallback: Find any 15-digit number starting with 3
    const any15DigitOrder = cleanText.match(/(3[0-9]{14,17}(?:_[0-9]+)?)/);
    if (any15DigitOrder) return ensureSuffix(any15DigitOrder[1]);

    return "";
  };

  const extractAwbId = (text, orderNo) => {
    // Split by newlines to match inside lines exclusively and avoid cross-line squishing (e.g. "Color" + Order ID)
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);

    // 1. Try matching with keywords in individual cleaned lines (no spaces inside the line)
    const patterns = [
      /awbno\.?[:\s\-]*([a-zA-Z0-9_\-\/]+)/i,
      /awb[:\s\-]*([a-zA-Z0-9_\-\/]+)/i,
      /trackingno\.?[:\s\-]*([a-zA-Z0-9_\-\/]+)/i,
      /trackingid[:\s\-]*([a-zA-Z0-9_\-\/]+)/i
    ];
    for (const line of lines) {
      const cleanLine = line.replace(/\s+/g, "");
      for (const pattern of patterns) {
        const match = cleanLine.match(pattern);
        if (match && match[1] && match[1] !== orderNo && match[1].length >= 8) {
          return match[1];
        }
      }
    }

    // 2. Fallback to normal text checks in individual lines
    const patternsNormal = [
      /awb\s*no\.?\s*[:\s\-]*([a-zA-Z0-9_\-\/]+)/i,
      /awb\s*[:\s\-]*([a-zA-Z0-9_\-\/]+)/i,
      /tracking\s*no\.?\s*[:\s\-]*([a-zA-Z0-9_\-\/]+)/i,
      /tracking\s*id\s*[:\s\-]*([a-zA-Z0-9_\-\/]+)/i
    ];
    for (const line of lines) {
      for (const pattern of patternsNormal) {
        const match = line.match(pattern);
        if (match && match[1] && match[1] !== orderNo && match[1].length >= 8) {
          return match[1];
        }
      }
    }

    // 3. Specific carrier formats: Valmo/Shadowfax (alphabetic prefix + 10-15 digits) on a line
    const valmoPattern = /(VL\d{10,15})/i;
    const generalAlphaPattern = /([a-zA-Z]{1,4}\d{9,15}[a-zA-Z]{0,4})/;
    const orderBase = (orderNo || "").split("_")[0];

    for (const line of lines) {
      const cleanLine = line.replace(/\s+/g, "");
      
      const valmoMatch = cleanLine.match(valmoPattern);
      if (valmoMatch && valmoMatch[1] && valmoMatch[1] !== orderNo && valmoMatch[1] !== orderBase) {
        return valmoMatch[1].toUpperCase();
      }

      const generalAlphaMatch = cleanLine.match(generalAlphaPattern);
      if (generalAlphaMatch && generalAlphaMatch[1] && generalAlphaMatch[1] !== orderNo && generalAlphaMatch[1] !== orderBase && !orderBase.includes(generalAlphaMatch[1])) {
        return generalAlphaMatch[1];
      }
    }

    // 4. Fallback: Find any 12-to-16 digit/char alphanumeric sequence on a single line (excluding orderNo and mobile numbers)
    for (const line of lines) {
      const cleanLine = line.replace(/\s+/g, "");
      
      // Match 12-to-16 digit numbers
      const allNumbers = cleanLine.match(/\d{12,16}/g) || [];
      for (const num of allNumbers) {
        if (num !== orderNo && num !== orderBase && !orderBase.includes(num) && !/^[6-9]\d{9}/.test(num)) {
          return num;
        }
      }
      
      // Match general alphanumeric AWB IDs (12 to 16 chars) requiring at least 8 digits to avoid address words
      const alphaNums = cleanLine.match(/(?=.*\d{8,})[a-zA-Z0-9]{12,16}/g) || [];
      for (const val of alphaNums) {
        if (
          val !== orderNo && 
          val !== orderBase && 
          !orderBase.includes(val) && 
          !/^[6-9]\d{9}/.test(val) && 
          !val.toLowerCase().includes("order") && 
          !val.toLowerCase().includes("invoice")
        ) {
          return val;
        }
      }
    }

    return "";
  };

  const extractQuantity = (text) => {
    const match = text.match(/qty\s*[:\s\-]*([0-9]+)/i) || text.match(/quantity\s*[:\s\-]*([0-9]+)/i);
    if (match && match[1]) {
      const qty = parseInt(match[1], 10);
      if (!isNaN(qty) && qty > 0) {
        return qty;
      }
    }
    return 1;
  };

  const extractOrderDate = (text) => {
    // Normalize spaces/newlines around dots/dashes
    const normalized = text.replace(/\s*([\.\-\/])\s*/g, "$1");
    
    // 1. Look for "order date" and grab nearest date pattern (e.g. DD.MM.YYYY)
    const lowerText = normalized.toLowerCase();
    const dateIndex = lowerText.indexOf("order date");
    if (dateIndex !== -1) {
      const subText = normalized.slice(dateIndex, dateIndex + 120);
      const dateMatch = subText.match(/\b(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})\b/);
      if (dateMatch) {
        const [_, day, month, year] = dateMatch;
        const paddedDay = day.padStart(2, "0");
        const paddedMonth = month.padStart(2, "0");
        return `${year}-${paddedMonth}-${paddedDay}`;
      }
    }

    // 2. Fallback to any date pattern on the page
    const dateMatch = normalized.match(/\b(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})\b/);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      const paddedDay = day.padStart(2, "0");
      const paddedMonth = month.padStart(2, "0");
      return `${year}-${paddedMonth}-${paddedDay}`;
    }

    // Default to today's date if no date found
    return new Date().toISOString().slice(0, 10);
  };

  const handlePdfUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setPdfParsing(true);
    setPdfProgress("Loading PDF.js extraction library...");

    try {
      const pdfjsLib = await new Promise((resolve, reject) => {
        if (window.pdfjsLib) {
          resolve(window.pdfjsLib);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        };
        script.onerror = (err) => reject(new Error("Failed to load PDF extraction library. Check your internet connection."));
        document.head.appendChild(script);
      });

      const parsedRows = [];

      for (let fIdx = 0; fIdx < files.length; fIdx++) {
        const file = files[fIdx];
        setPdfProgress(`Reading file ${fIdx + 1} of ${files.length} (${file.name})...`);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        for (let i = 1; i <= totalPages; i++) {
          setPdfProgress(`File ${fIdx + 1}/${files.length}: page ${i} of ${totalPages}...`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const textItems = textContent.items.map(item => item.str);
          const pageText = textItems.join("\n");

          if (!pageText.trim()) continue;

          const orderNoMatch = extractOrderNo(pageText);
          const awbIdMatch = extractAwbId(pageText, orderNoMatch);
          const courier = extractCourierPartner(pageText);
          const state = extractCustomerState(pageText, INDIA_STATES);
          const qty = extractQuantity(pageText);
          const dateMatch = extractOrderDate(pageText);

          const matchedP = autoMatchProduct(pageText, products);
          
          const isDuplicateInCurrentUpload = orderNoMatch && parsedRows.some(row => row.orderNo && row.orderNo.trim() === orderNoMatch.trim());
          const isAwbDuplicateInCurrentUpload = awbIdMatch && parsedRows.some(row => row.awbId && row.awbId.trim() === awbIdMatch.trim());

          const isDuplicateOrder = (orderNoMatch && orders.some(o => o.orderNo && o.orderNo.trim() === orderNoMatch.trim())) || isDuplicateInCurrentUpload;
          const isDuplicateAwb = (awbIdMatch && orders.some(o => o.awbId && o.awbId.trim() === awbIdMatch.trim())) || isAwbDuplicateInCurrentUpload;

          parsedRows.push({
            tempId: `parsed-${fIdx}-${i}-${Date.now()}-${Math.random()}`,
            pageNum: i,
            fileName: file.name,
            date: dateMatch,
            orderNo: orderNoMatch,
            awbId: awbIdMatch,
            courierPartner: courier,
            customerState: state,
            quantity: String(qty),
            gst: matchedP ? String(matchedP.gst) : "18",
            productId: matchedP ? matchedP._id : "",
            productName: matchedP ? matchedP.productName : "",
            purchasePrice: matchedP ? String(matchedP.purchasePrice) : "",
            sellingPrice: matchedP ? String(matchedP.sellingPrice) : "",
            pageText: pageText,
            isDuplicate: isDuplicateOrder || isDuplicateAwb,
            duplicateReason: isDuplicateOrder && isDuplicateAwb 
              ? "Duplicate Order ID & Tracking ID" 
              : isDuplicateOrder 
                ? "Duplicate Order ID" 
                : isDuplicateAwb 
                  ? "Duplicate Tracking ID (AWB)" 
                  : ""
          });
        }
      }

      if (parsedRows.length === 0) {
        throw new Error("Could not find any readable text/shipping labels in the selected PDF files. Please ensure they are standard digital Meesho shipping label PDFs.");
      }

      setParsedOrders(parsedRows);
      setPreviewModalOpen(true);
    } catch (err) {
      showAlert(err.message, "Parsing Error");
    } finally {
      setPdfParsing(false);
      setPdfProgress("");
      e.target.value = "";
    }
  };

  const handleParsedProductChange = (tempId, pId) => {
    const matchedP = products.find(p => p._id === pId);
    setParsedOrders(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return {
          ...item,
          productId: pId,
          productName: matchedP ? matchedP.productName : "",
          purchasePrice: matchedP ? String(matchedP.purchasePrice) : "",
          sellingPrice: matchedP ? String(matchedP.sellingPrice) : "",
          gst: matchedP ? String(matchedP.gst) : "18"
        };
      }
      return item;
    }));
  };

  const handleParsedFieldChange = (tempId, field, value) => {
    setParsedOrders(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const updated = { ...item, [field]: value };
        if (field === "orderNo" || field === "awbId") {
          const checkOrderNo = field === "orderNo" ? value : item.orderNo;
          const checkAwbId = field === "awbId" ? value : item.awbId;
          const isDuplicateOrder = checkOrderNo && orders.some(o => o.orderNo && o.orderNo.trim() === checkOrderNo.trim());
          const isDuplicateAwb = checkAwbId && orders.some(o => o.awbId && o.awbId.trim() === checkAwbId.trim());
          updated.isDuplicate = isDuplicateOrder || isDuplicateAwb;
          updated.duplicateReason = isDuplicateOrder && isDuplicateAwb 
            ? "Duplicate Order ID & Tracking ID" 
            : isDuplicateOrder 
              ? "Duplicate Order ID" 
              : isDuplicateAwb 
                ? "Duplicate Tracking ID (AWB)" 
                : "";
        }
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveParsedRow = (tempId) => {
    setParsedOrders(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleImportParsedOrders = async () => {
    const validOrders = parsedOrders.filter(item => !item.isDuplicate && item.productId);
    if (validOrders.length === 0) {
      showAlert("No valid, non-duplicate orders with products selected to import.", "Import Info");
      return;
    }

    setPdfParsing(true);
    setPdfProgress(`Saving ${validOrders.length} orders...`);

    const targetShop = shops.find(s => s.shopName === pdfSelectedShop);
    const targetPlatform = targetShop ? targetShop.platform : "Meesho";

    try {
      const payload = {
        orders: validOrders.map(item => ({
          date: item.date,
          shopName: pdfSelectedShop || "HKC Collection",
          shopPlatform: targetPlatform,
          orderNo: item.orderNo.trim(),
          awbId: item.awbId.trim(),
          courierPartner: item.courierPartner,
          customerState: item.customerState,
          productId: item.productId,
          productName: item.productName,
          purchasePrice: Number(item.purchasePrice),
          sellingPrice: Number(item.sellingPrice),
          quantity: Number(item.quantity),
          gst: Number(item.gst),
          paymentStatus: "Pending",
          dispatchStatus: "Dispatched",
          claimStatus: "No Claim",
          claimAmount: 0
        }))
      };

      const res = await fetch(`${API_URL}/api/orders/bulk-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to bulk import orders");
      }

      const resData = await res.json();
      setPreviewModalOpen(false);
      setParsedOrders([]);
      fetchOrders();
      showAlert(resData.message, "Import Successful");
    } catch (err) {
      showAlert(err.message, "Import Error");
    } finally {
      setPdfParsing(false);
      setPdfProgress("");
    }
  };

  const startEdit = (o) => {
    setEditingOrder(o);
    setEditShopName(o.shopName || "HKC Collection");
    setEditShopPlatform(o.shopPlatform || "Meesho");
    setEditDate(new Date(o.date || o.createdAt).toISOString().slice(0, 10));
    setEditOrderNo(o.orderNo || "");
    setEditProductId(o.productId?._id || o.productId || "");
    setEditProductName(o.productName || o.productId?.productName || "");
    setEditCustomerState(o.customerState || "Gujarat");
    setEditPurchasePrice(o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || ""));
    setEditSellingPrice(o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || ""));
    setEditQuantity(o.quantity || "1");
    setEditGst(o.gst || o.productId?.gst || "18");
    setEditCourierPartner(o.courierPartner || "Valmo");
    setEditAwbId(o.awbId || "");
    setEditPaymentStatus(o.paymentStatus || "Pending");
    setEditDispatchStatus(o.dispatchStatus || "Pending");
    setEditClaimStatus(o.claimStatus || "No Claim");
    setEditClaimAmount(o.claimAmount !== undefined ? String(o.claimAmount) : "0");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!editProductName.trim() || !editPurchasePrice || !editSellingPrice) {
      showAlert("Please fill in the Product Name, Purchase Price, and Selling Price.", "Validation Error");
      return;
    }

    setSubmitting(true);

    try {
      const selectedShopObj = shops.find(s => s.shopName === editShopName);
      const chosenPlatform = selectedShopObj ? selectedShopObj.platform : editShopPlatform;

      let finalClaimStatus = editClaimStatus;
      if (editPaymentStatus === "Wrong Return" && (!editClaimStatus || editClaimStatus === "No Claim")) {
        finalClaimStatus = "Pending";
      }

      const payload = {
        shopName: editShopName || "HKC Collection",
        shopPlatform: chosenPlatform,
        orderNo: editOrderNo.trim(),
        awbId: editAwbId.trim(),
        customerState: editCustomerState,
        productId: editProductId || undefined,
        productName: editProductName.trim(),
        purchasePrice: Number(editPurchasePrice),
        sellingPrice: Number(editSellingPrice),
        quantity: Number(editQuantity),
        gst: Number(editGst),
        courierPartner: editCourierPartner,
        paymentStatus: editPaymentStatus,
        dispatchStatus: editDispatchStatus,
        claimStatus: finalClaimStatus,
        claimAmount: Number(editClaimAmount) || 0,
        date: new Date(editDate).toISOString()
      };

      const res = await fetch(`${API_URL}/api/orders/${editingOrder._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update entry");
      }

      setEditingOrder(null);
      fetchOrders();
      fetchStockSummary();
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductSelect = (value) => {
    setProductName(value);

    const matchedProduct = products.find(p => p.productName === value);
    if (matchedProduct) {
      setProductId(matchedProduct._id);
      setPurchasePrice(String(matchedProduct.purchasePrice));
      setSellingPrice(String(matchedProduct.sellingPrice));
      setGst(String(matchedProduct.gst || 18));
    } else {
      setProductId("");
      setPurchasePrice("");
      setSellingPrice("");
      setGst("18");
    }
  };

  const handleEditProductSelect = (value) => {
    setEditProductName(value);

    const matchedProduct = products.find(p => p.productName === value);
    if (matchedProduct) {
      setEditProductId(matchedProduct._id);
      setEditPurchasePrice(String(matchedProduct.purchasePrice));
      setEditSellingPrice(String(matchedProduct.sellingPrice));
      setEditGst(String(matchedProduct.gst || 18));
    } else {
      setEditProductId("");
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStockSummary();
    fetchProducts();
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
        const def = data.find(s => s.isDefault) || data[0];
        if (def) {
          setShopName(def.shopName);
          setShopPlatform(def.platform || "Meesho");
          setPdfSelectedShop(def.shopName);
        }
      }
    } catch (err) {
      console.error("Failed to fetch shops:", err);
    }
  };

  const handleShopSelect = (selectedShopName) => {
    setShopName(selectedShopName);
    const matched = shops.find(s => s.shopName === selectedShopName);
    if (matched) {
      setShopPlatform(matched.platform || "Meesho");
    }
  };

  const handleEditShopSelect = (selectedShopName) => {
    setEditShopName(selectedShopName);
    const matched = shops.find(s => s.shopName === selectedShopName);
    if (matched) {
      setEditShopPlatform(matched.platform || "Meesho");
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const fetchStockSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/investments/stock`, {
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
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch accounts data");
      const data = await res.json();
      // Sort by date descending
      const sorted = data.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      setOrders(sorted);
      setSelectedOrderIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleAddRow = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!productName.trim() || !purchasePrice || !sellingPrice) {
      showAlert("Please fill in the Product Name, Purchase Price, and Selling Price.", "Validation Error");
      return;
    }

    const trimmedOrderNo = orderNo.trim();
    const trimmedAwbId = awbId.trim();

    // Check duplicate Order ID in current state
    if (trimmedOrderNo) {
      const dupOrder = orders.find(o => o.orderNo && o.orderNo.trim().toLowerCase() === trimmedOrderNo.toLowerCase());
      if (dupOrder) {
        showAlert(`❌ Duplicate Order ID: "${trimmedOrderNo}" is already logged! Duplicate Order IDs are not allowed.`, "Duplicate Order ID");
        return;
      }
    }

    // Check duplicate Tracking ID in current state
    if (trimmedAwbId) {
      const dupAwb = orders.find(o => o.awbId && o.awbId.trim().toLowerCase() === trimmedAwbId.toLowerCase());
      if (dupAwb) {
        showAlert(`❌ Duplicate Tracking ID: "${trimmedAwbId}" is already logged! Duplicate Tracking IDs are not allowed.`, "Duplicate Tracking ID");
        return;
      }
    }

    setSubmitting(true);

    try {
      const selectedShopObj = shops.find(s => s.shopName === shopName);
      const currentPlatform = selectedShopObj ? selectedShopObj.platform : shopPlatform;

      const payload = {
        shopName: shopName || "HKC Collection",
        shopPlatform: currentPlatform,
        orderNo: trimmedOrderNo,
        awbId: trimmedAwbId,
        customerState,
        productId: productId || undefined,
        productName: productName.trim(),
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        quantity: Number(quantity),
        shippingCost: 0, // Set to 0 since field is removed
        gst: Number(gst),
        courierPartner,
        paymentStatus: "Pending",
        date: new Date(date).toISOString(),
        customerName: "Customer",
        status: "Completed",
        deliveryStatus: "Delivered"
      };

      const res = await fetch(`${API_URL}/api/orders/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        showAlert(`❌ ${errData.message || "Failed to add entry to accounts"}`, "Error");
        setSubmitting(false);
        return;
      }

      // Reset entry form except product name if they want to log different pricing or dates
      setOrderNo("");
      setAwbId("");
      setProductId("");
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
      showAlert(err.message, "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRow = (id) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false);
    if (!deleteId) return;

    try {
      const res = await fetch(`${API_URL}/api/orders/${deleteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete entry");

      setOrders(orders.filter((o) => o._id !== deleteId));
      fetchStockSummary();
    } catch (err) {
      showAlert(err.message, "Error");
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const orderToUpdate = orders.find(o => o._id === id);
      const updatePayload = { paymentStatus: newStatus };
      if (newStatus === "Wrong Return" && (!orderToUpdate?.claimStatus || orderToUpdate?.claimStatus === "No Claim")) {
        updatePayload.claimStatus = "Pending";
      }

      const res = await fetch(`${API_URL}/api/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(updatePayload)
      });
      if (!res.ok) throw new Error("Failed to update status");

      const data = await res.json();
      setOrders((prev) => prev.map((o) => (o._id === id ? data.order : o)));
      fetchStockSummary();
    } catch (err) {
      showAlert(err.message, "Error");
    }
  };



  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Accounts - Spreadsheet\n\n";
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
    link.setAttribute("download", `accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLedgerStats = () => {
    let totalQty = 0;
    let totalPurchase = 0;
    let totalSales = 0;
    let totalProfit = 0;
    let totalReturnCost = 0;

    orders.forEach((o) => {
      const purchaseVal = o.purchasePrice !== undefined && o.purchasePrice !== null ? o.purchasePrice : (o.productId?.purchasePrice || 0);
      const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
      const qtyVal = o.quantity || 1;
      
      const profit = calculateOrderProfit(o);
      const payStatus = o.paymentStatus || "Pending";
      const claimAmt = o.claimAmount || 0;
      
      totalQty += qtyVal;
      totalProfit += profit;
      
      // Income (totalSales) & totalPurchase ONLY count after order is Complete!
      if (payStatus === "Complete") {
        totalPurchase += purchaseVal * qtyVal;
        totalSales += sellingVal * qtyVal;
      }

      if (payStatus === "Return") {
        totalReturnCost += (o.claimStatus === "Approved" ? (157 - claimAmt) : 157);
      } else if (payStatus === "Wrong Return") {
        totalReturnCost += (o.claimStatus === "Approved" ? -claimAmt : 0);
      }
    });

    return { totalQty, totalPurchase, totalSales, totalProfit, totalReturnCost };
  };

  const stats = getLedgerStats();

  // Filtered orders based on search inputs
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Shop filter
      if (filterShop && filterShop !== "All") {
        const orderShop = (o.shopName || "HKC Collection").trim().toLowerCase();
        if (orderShop !== filterShop.trim().toLowerCase()) return false;
      }
      // Date filter
      if (filterDate) {
        const orderDate = new Date(o.date || o.createdAt).toISOString().slice(0, 10);
        if (orderDate !== filterDate) return false;
      }
      // Status filter
      if (filterStatus && (o.paymentStatus || "Pending") !== filterStatus) return false;
      // Product filter
      if (filterProduct) {
        const prodName = (o.productName || o.productId?.productName || "Unknown Product").trim().toLowerCase();
        if (prodName !== filterProduct.trim().toLowerCase()) return false;
      }
      // Courier Partner filter
      if (filterCourier) {
        const courier = o.courierPartner || "Valmo";
        if (courier !== filterCourier) return false;
      }
      // Customer State filter
      if (filterCustomerState) {
        const stateName = o.customerState || "Gujarat";
        if (stateName !== filterCustomerState) return false;
      }
      // Order ID filter
      if (filterOrderNo.trim()) {
        const orderNoStr = (o.orderNo || "").toLowerCase();
        if (!orderNoStr.includes(filterOrderNo.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, filterShop, filterDate, filterStatus, filterProduct, filterCourier, filterCustomerState, filterOrderNo]);

  // Stats for filtered results
  const filteredStats = useMemo(() => {
    let totalQty = 0;
    let totalProfit = 0;
    let totalSales = 0;
    let totalReturnCost = 0;

    filteredOrders.forEach((o) => {
      const sellingVal = o.sellingPrice !== undefined && o.sellingPrice !== null ? o.sellingPrice : (o.productId?.sellingPrice || 0);
      const qtyVal = o.quantity || 1;
      const profit = calculateOrderProfit(o);
      const payStatus = o.paymentStatus || "Pending";
      const claimAmt = o.claimAmount || 0;

      totalQty += qtyVal;
      totalProfit += profit;

      if (payStatus === "Complete") {
        totalSales += sellingVal * qtyVal;
      }

      if (payStatus === "Return") {
        totalReturnCost += (o.claimStatus === "Approved" ? (157 - claimAmt) : 157);
      } else if (payStatus === "Wrong Return") {
        totalReturnCost += (o.claimStatus === "Approved" ? -claimAmt : 0);
      }
    });

    return { totalQty, totalProfit, totalSales, totalReturnCost };
  }, [filteredOrders]);

  const handleToggleSelect = (id) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const visibleIds = filteredOrders.map(o => o._id);
    const allVisibleSelected = visibleIds.every(id => selectedOrderIds.includes(id));

    if (allVisibleSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedOrderIds.length === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    setBulkDeleteConfirmOpen(false);
    if (selectedOrderIds.length === 0) return;

    try {
      const res = await fetch(`${API_URL}/api/orders/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ ids: selectedOrderIds })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to bulk delete entries");

      fetchOrders();
      fetchStockSummary();
      showAlert(resData.message, "Success");
    } catch (err) {
      showAlert(err.message, "Error");
    }
  };

  const isAllSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o._id));

  const claimStats = useMemo(() => {
    let totalClaims = 0;
    let pendingClaims = 0;
    let approvedClaims = 0;
    let rejectedClaims = 0;
    let approvedAmount = 0;

    orders.forEach((o) => {
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
  }, [orders]);

  const hasFilter = (filterShop && filterShop !== "All") || filterDate || filterStatus || filterProduct || filterCourier || filterCustomerState || filterOrderNo.trim();
  const clearFilters = () => {
    setFilterShop("All");
    setFilterProduct("");
    setFilterDate("");
    setFilterStatus("");
    setFilterCourier("");
    setFilterCustomerState("");
    setFilterOrderNo("");
  };

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
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "var(--glass-shadow)"
      }}>
        {/* Filter Inputs Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "16px",
          alignItems: "flex-end"
        }}>
          {/* Shop / Account Filter */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
              Shop / Account
            </label>
            <select
              value={filterShop}
              onChange={(e) => {
                setFilterShop(e.target.value);
                setSearchParams(e.target.value === "All" ? {} : { shop: e.target.value });
              }}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="All">All Shops</option>
              {shops.map((s) => (
                <option key={s._id} value={s.shopName}>
                  {s.shopName} ({s.platform})
                </option>
              ))}
              {Array.from(new Set(orders.map(o => o.shopName || "HKC Collection")))
                .filter(name => !shops.some(s => s.shopName === name))
                .map(name => (
                  <option key={name} value={name}>{name}</option>
                ))
              }
            </select>
          </div>

          {/* Order No Filter */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Order No. / ID</label>
            <input
              type="text"
              placeholder="Filter by Order ID..."
              value={filterOrderNo}
              onChange={(e) => setFilterOrderNo(e.target.value)}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            />
          </div>

          {/* Product Filter */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Product Name</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p._id} value={p.productName}>{p.productName}</option>
              ))}
              {Array.from(new Set(orders.map(o => o.productName || o.productId?.productName || "")))
                .filter(name => name && !products.some(p => p.productName === name))
                .map(name => (
                  <option key={name} value={name}>{name} (Legacy)</option>
                ))
              }
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Order Date</label>
            <div style={{ position: "relative" }}>
              <FaCalendarAlt style={{ position: "absolute", left: "10px", top: "11px", color: "var(--text-muted)", fontSize: "12px" }} />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                style={{ paddingLeft: "32px", height: "38px", fontSize: "13px" }}
                title="Filter by Date"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Payment Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Complete">Complete</option>
              <option value="Cancel">Cancel</option>
              <option value="RTO Returned">RTO Returned</option>
              <option value="Return">Return</option>
              <option value="Wrong Return">Wrong Return</option>
            </select>
          </div>

          {/* Courier Partner Filter */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Courier Partner</label>
            <select
              value={filterCourier}
              onChange={(e) => setFilterCourier(e.target.value)}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="">All Couriers</option>
              <option value="Valmo">Valmo</option>
              <option value="Xpressbees">Xpressbees</option>
              <option value="Shadowfax">Shadowfax</option>
              <option value="Delhivery">Delhivery</option>
              <option value="Ecom">Ecom</option>
            </select>
          </div>

          {/* Customer State Filter */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Customer State</label>
            <select
              value={filterCustomerState}
              onChange={(e) => setFilterCustomerState(e.target.value)}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="">All States</option>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>



          {/* Clear Button Container */}
          <div style={{ display: "flex", alignItems: "flex-end", height: "38px" }}>
            {hasFilter && (
              <button
                onClick={clearFilters}
                style={{
                  height: "38px", padding: "0 14px", borderRadius: "8px", fontSize: "13px",
                  background: "rgba(239,68,68,0.1)", color: "var(--danger)",
                  border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px", width: "100%", justifyContent: "center"
                }}
              >
                <FaTimes /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary Panel */}
        <div style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
            {hasFilter ? (
              <span>Active filters applied. Showing matching results.</span>
            ) : (
              <span>Showing all transactions. Use filters above to narrow down.</span>
            )}
          </div>
          
          <div style={{
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
                <span>Sales: <strong style={{ color: "#10b981" }}>₹{filteredStats.totalSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></span>
                <span>Return Cost: <strong style={{ color: "#ef4444" }}>₹{filteredStats.totalReturnCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></span>
                <span>Profit: <strong style={{ color: filteredStats.totalProfit >= 0 ? "var(--success)" : "var(--danger)" }}>₹{filteredStats.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </>
            ) : (
              <>
                <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Total</span>
                <span>Orders: <strong style={{ color: "var(--primary)" }}>{orders.length}</strong></span>
                <span>Qty: <strong style={{ color: "#f59e0b" }}>{stats.totalQty}</strong></span>
                <span>Sales: <strong style={{ color: "#10b981" }}>₹{stats.totalSales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></span>
                <span>Return Cost: <strong style={{ color: "#ef4444" }}>₹{stats.totalReturnCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></span>
                <span>Profit: <strong style={{ color: stats.totalProfit >= 0 ? "var(--success)" : "var(--danger)" }}>₹{stats.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Import Meesho Labels PDF */}
      <div 
        style={{
          background: "var(--glass-bg)",
          border: "2px dashed var(--primary)",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "20px",
          boxShadow: "var(--glass-shadow)",
          textAlign: "center",
          position: "relative",
          cursor: "pointer",
          transition: "all 0.3s ease"
        }}
      >
        <input 
          type="file" 
          accept=".pdf" 
          multiple
          onChange={handlePdfUpload}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0,
            width: "100%",
            cursor: "pointer"
          }}
          disabled={pdfParsing}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <FaFileInvoice style={{ fontSize: "36px", color: "var(--primary)" }} />
          <div>
            <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
              {pdfParsing ? pdfProgress : "Bulk Import Meesho Labels PDF"}
            </h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
              {pdfParsing ? "Processing labels... please wait." : "Drag & drop or click to upload one or more Meesho shipping label PDF files"}
            </p>
          </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          
          {/* Row 1: General Details */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Shop / Account</label>
            <select value={shopName} onChange={(e) => handleShopSelect(e.target.value)} style={{ width: "100%" }}>
              {shops.map((s) => (
                <option key={s._id} value={s.shopName}>
                  {s.shopName} ({s.platform})
                </option>
              ))}
              {shopName && !shops.some(s => s.shopName === shopName) && (
                <option value={shopName}>{shopName}</option>
              )}
            </select>
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
              onChange={(e) => setOrderNo(e.target.value)} 
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
            <select
              value={productName}
              onChange={(e) => handleProductSelect(e.target.value)}
              required
              style={{ width: "100%" }}
            >
              <option value="">Select Product...</option>
              {products.map((p) => (
                <option key={p._id} value={p.productName}>{p.productName}</option>
              ))}
              {products.length === 0 && (
                <>
                  <option value="Air Bra (Pack of 3)">Air Bra (Pack of 3)</option>
                  <option value="Air Bra (Pack of 6)">Air Bra (Pack of 6)</option>
                  <option value="Megical Bra (Pack of 3)">Megical Bra (Pack of 3)</option>
                  <option value="Megical Bra (Pack of 6)">Megical Bra (Pack of 6)</option>
                  <option value="Shapewear Black">Shapewear Black</option>
                  <option value="Shapewear Black (Pack of 2)">Shapewear Black (Pack of 2)</option>
                  <option value="Shapewear Cream">Shapewear Cream</option>
                  <option value="Shapewear Cream (Pack of 2)">Shapewear Cream (Pack of 2)</option>
                  <option value="Shapewear Black and Cream (Pack of 2)">Shapewear Black and Cream (Pack of 2)</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Buying Price (₹)</label>
            <input type="number" min="0" placeholder="Your buying price" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Selling Price (₹)</label>
            <input type="number" min="0" placeholder="Selling price" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required style={{ width: "100%" }} />
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
              disabled={submitting}
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
              <FaPlus /> {submitting ? "Inserting..." : "Insert Row"}
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
        <>
          {/* Bulk Action Toolbar */}
          {selectedOrderIds.length > 0 && (
        <div 
          className="animate-fade"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            padding: "12px 20px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--glass-shadow)"
          }}
        >
          <div style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "600" }}>
            Selected <strong style={{ color: "#ef4444" }}>{selectedOrderIds.length}</strong> orders from list
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="button"
              onClick={() => setSelectedOrderIds([])}
              style={{
                background: "transparent",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Clear Selection
            </button>
            <button 
              type="button"
              onClick={handleBulkDeleteClick}
              style={{
                background: "#ef4444",
                border: "none",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <FaTrash /> Delete Selected
            </button>
          </div>
        </div>
      )}

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
                <th style={{ padding: "14px 16px", textAlign: "center", width: "40px" }}>
                  <input type="checkbox" checked={isAllSelected} onChange={handleToggleSelectAll} style={{ cursor: "pointer" }} />
                </th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Date</th>
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Shop / Store</th>
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
                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "13px" }}>Platform Claim</th>
                <th style={{ padding: "14px 16px", textAlign: "right", fontSize: "13px" }}>Net Profit (₹)</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "13px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="16" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px", fontSize: "14px" }}>
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
                  const pStyle = getPlatformStyle(o.shopPlatform || "Meesho");
                  
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
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={selectedOrderIds.includes(o._id)} 
                          onChange={() => handleToggleSelect(o._id)} 
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FaCalendarAlt style={{ color: "var(--text-muted)" }} />
                          {formattedDate}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "13px" }}>
                            {o.shopName || "HKC Collection"}
                          </span>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: pStyle.bg,
                            color: pStyle.color,
                            border: `1px solid ${pStyle.border}`,
                            width: "fit-content",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px"
                          }}>
                            <FaTag style={{ fontSize: "8px" }} /> {o.shopPlatform || "Meesho"}
                          </span>
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
                            width: "125px",
                            backgroundColor: 
                              o.paymentStatus === "Complete" ? "rgba(16, 185, 129, 0.15)" :
                              o.paymentStatus === "Pending" ? "rgba(245, 158, 11, 0.15)" :
                              o.paymentStatus === "RTO Returned" ? "rgba(14, 165, 233, 0.15)" :
                              o.paymentStatus === "Return" ? "rgba(139, 92, 246, 0.15)" :
                              o.paymentStatus === "Wrong Return" ? "rgba(239, 68, 68, 0.2)" :
                              "rgba(239, 68, 68, 0.15)",
                            color:
                              o.paymentStatus === "Complete" ? "var(--success)" :
                              o.paymentStatus === "Pending" ? "var(--warning)" :
                              o.paymentStatus === "RTO Returned" ? "var(--info)" :
                              o.paymentStatus === "Return" ? "#a78bfa" :
                              o.paymentStatus === "Wrong Return" ? "var(--danger)" :
                              "var(--danger)"
                          }}
                        >
                          <option value="Pending" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Pending</option>
                          <option value="Complete" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Complete</option>
                          <option value="RTO Returned" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>RTO Returned</option>
                          <option value="Cancel" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Cancel</option>
                          <option value="Return" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Return</option>
                          <option value="Wrong Return" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>Wrong Return</option>
                        </select>
                      </td>

                      {/* Platform Claim status and amount */}
                      <td style={{ padding: "14px 16px", fontSize: "13px" }}>
                        {o.claimStatus && o.claimStatus !== "No Claim" ? (
                          <div>
                            <span style={{
                              padding: "3px 6px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "600",
                              backgroundColor: 
                                o.claimStatus === "Approved" ? "rgba(16, 185, 129, 0.15)" :
                                o.claimStatus === "Pending" ? "rgba(245, 158, 11, 0.15)" :
                                "rgba(239, 68, 68, 0.15)",
                              color:
                                o.claimStatus === "Approved" ? "var(--success)" :
                                o.claimStatus === "Pending" ? "var(--warning)" :
                                "var(--danger)",
                              display: "inline-block",
                              marginBottom: "2px"
                            }}>
                              {o.claimStatus}
                            </span>
                            {o.claimStatus === "Approved" && o.claimAmount > 0 && (
                              <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--success)" }}>
                                +₹{o.claimAmount}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "12px" }}>-</span>
                        )}
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
                  <td colSpan="7" style={{ padding: "16px", textTransform: "uppercase", fontSize: "12px", color: "var(--primary)", trackingSpacing: "1px" }}>
                    <FaFileInvoice /> Accounts Totals
                  </td>
                  <td style={{ padding: "16px", textAlign: "right", fontSize: "13px", color: "var(--text-primary)" }}>
                    ₹{stats.totalPurchase.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "16px", textAlign: "right", fontSize: "13px", color: "var(--primary)" }}>
                    ₹{stats.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--text-primary)" }}>
                    {stats.totalQty}
                  </td>
                  <td colSpan="4" style={{ padding: "16px" }}></td>
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
      </>
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
                  <label>Shop / Account</label>
                  <select value={editShopName} onChange={(e) => handleEditShopSelect(e.target.value)}>
                    {shops.map((s) => (
                      <option key={s._id} value={s.shopName}>
                        {s.shopName} ({s.platform})
                      </option>
                    ))}
                    {editShopName && !shops.some(s => s.shopName === editShopName) && (
                      <option value={editShopName}>{editShopName}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label>Order No. / ID</label>
                  <input type="text" value={editOrderNo} onChange={(e) => setEditOrderNo(e.target.value)} />
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
                  <select 
                    value={editProductName} 
                    onChange={(e) => handleEditProductSelect(e.target.value)} 
                    required 
                  >
                    <option value="">Select Product...</option>
                    {products.map((p) => (
                      <option key={p._id} value={p.productName}>{p.productName}</option>
                    ))}
                    {editProductName && !products.some(p => p.productName === editProductName) && (
                      <option value={editProductName}>{editProductName} (Legacy)</option>
                    )}
                  </select>
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
                    <option value="Wrong Return">Wrong Return</option>
                  </select>
                </div>
                <div className="form-full">
                  <label>Dispatch Status</label>
                  <select value={editDispatchStatus} onChange={(e) => setEditDispatchStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Dispatched">Dispatched</option>
                  </select>
                </div>

                <div className="form-full">
                  <label>Platform Claim Status</label>
                  <select value={editClaimStatus} onChange={(e) => setEditClaimStatus(e.target.value)}>
                    <option value="No Claim">No Claim</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                {editClaimStatus === "Approved" && (
                  <div className="form-full">
                    <label>Claim Amount (₹)</label>
                    <input 
                      type="number" 
                      value={editClaimAmount} 
                      onChange={(e) => setEditClaimAmount(e.target.value)} 
                      min="0" 
                      step="0.01" 
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingOrder(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Parsed Orders Preview Modal */}
      {previewModalOpen && (
        <div style={{
          position: "fixed",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "1100px",
            maxHeight: "90vh",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--glass-shadow)",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaFileInvoice /> Review Extracted Orders ({parsedOrders.length})
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "4px" }}>
                  We scanned the PDF labels and filled the fields. Please check product matches and select correct products where unmatched.
                </p>
              </div>
              <button 
                onClick={() => { setPreviewModalOpen(false); setParsedOrders([]); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Shop Batch Assignment Toolbar */}
            <div style={{
              padding: "12px 20px",
              background: "rgba(99, 102, 241, 0.08)",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FaStore style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                  Assign this Batch to Shop:
                </span>
                <select
                  value={pdfSelectedShop}
                  onChange={(e) => setPdfSelectedShop(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)"
                  }}
                >
                  {shops.map(s => (
                    <option key={s._id} value={s.shopName}>
                      {s.shopName} ({s.platform})
                    </option>
                  ))}
                  {pdfSelectedShop && !shops.some(s => s.shopName === pdfSelectedShop) && (
                    <option value={pdfSelectedShop}>{pdfSelectedShop}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", textTransform: "uppercase", fontSize: "11px", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "120px" }}>File / Page</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "140px" }}>Order ID</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "130px" }}>AWB ID</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "110px" }}>Courier</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "130px" }}>State</th>
                    <th style={{ padding: "10px 8px", textAlign: "left" }}>Product Match (Select correct product)</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", width: "60px" }}>Qty</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", width: "70px" }}>Status</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", width: "50px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedOrders.map((item) => (
                    <Fragment key={item.tempId}>
                      <tr 
                        style={{ 
                          borderBottom: "1px solid var(--border-color)",
                          background: item.isDuplicate ? "rgba(239, 68, 68, 0.05)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "10px 8px", textAlign: "left", color: "var(--text-muted)", fontSize: "11px" }}>{item.fileName ? `${item.fileName} (p.${item.pageNum})` : item.pageNum}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <input 
                          type="text" 
                          value={item.orderNo} 
                          onChange={(e) => handleParsedFieldChange(item.tempId, "orderNo", e.target.value)} 
                          style={{ height: "30px", fontSize: "13px", padding: "0 6px", width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input 
                          type="text" 
                          value={item.awbId} 
                          onChange={(e) => handleParsedFieldChange(item.tempId, "awbId", e.target.value)} 
                          style={{ height: "30px", fontSize: "13px", padding: "0 6px", width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
                        />
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <select 
                          value={item.courierPartner} 
                          onChange={(e) => handleParsedFieldChange(item.tempId, "courierPartner", e.target.value)}
                          style={{ height: "30px", fontSize: "13px", padding: "0 4px", width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
                        >
                          <option value="Valmo">Valmo</option>
                          <option value="Xpressbees">Xpressbees</option>
                          <option value="Shadowfax">Shadowfax</option>
                          <option value="Delhivery">Delhivery</option>
                          <option value="Ecom">Ecom</option>
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <select 
                          value={item.customerState} 
                          onChange={(e) => handleParsedFieldChange(item.tempId, "customerState", e.target.value)}
                          style={{ height: "30px", fontSize: "13px", padding: "0 4px", width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
                        >
                          {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <select 
                          value={item.productId} 
                          onChange={(e) => handleParsedProductChange(item.tempId, e.target.value)}
                          style={{ 
                            height: "30px", 
                            fontSize: "13px", 
                            padding: "0 4px", 
                            width: "100%",
                            background: !item.productId ? "rgba(245, 158, 11, 0.05)" : "var(--bg-primary)",
                            borderColor: !item.productId ? "var(--warning)" : "var(--border-color)",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderRadius: "4px",
                            color: "var(--text-primary)"
                          }}
                        >
                          <option value="">-- UNMATCHED (Please Select) --</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>{p.productName} (Buy: ₹{p.purchasePrice} | Sell: ₹{p.sellingPrice})</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <input 
                          type="number" 
                          min="1"
                          value={item.quantity} 
                          onChange={(e) => handleParsedFieldChange(item.tempId, "quantity", e.target.value)} 
                          style={{ height: "30px", fontSize: "13px", padding: "0 6px", width: "100%", textAlign: "center", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
                        />
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        {item.isDuplicate ? (
                          <span 
                            title={item.duplicateReason}
                            style={{ 
                              background: "rgba(239, 68, 68, 0.15)", 
                              color: "var(--danger)", 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              fontSize: "10px", 
                              fontWeight: "bold",
                              display: "inline-block",
                              maxWidth: "80px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            Duplicate
                          </span>
                        ) : !item.productId ? (
                          <span 
                            style={{ 
                              background: "rgba(245, 158, 11, 0.15)", 
                              color: "#b45309", 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              fontSize: "10px", 
                              fontWeight: "bold",
                              display: "inline-block"
                            }}
                          >
                            No Product
                          </span>
                        ) : (
                          <span 
                            style={{ 
                              background: "rgba(34, 197, 94, 0.15)", 
                              color: "var(--success)", 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              fontSize: "10px", 
                              fontWeight: "bold",
                              display: "inline-block"
                            }}
                          >
                            Ready
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <button 
                            type="button"
                            onClick={() => setExpandedRawText(expandedRawText === item.tempId ? null : item.tempId)}
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: expandedRawText === item.tempId ? "var(--primary)" : "var(--text-muted)", 
                              cursor: "pointer", 
                              padding: "4px" 
                            }}
                            title="View Extracted Text"
                          >
                            <FaSearch size={12} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveParsedRow(item.tempId)}
                            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "4px" }}
                            title="Remove label page"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRawText === item.tempId && (
                      <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                        <td colSpan="9" style={{ padding: "12px 20px" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "bold" }}>
                            RAW TEXT EXTRACTED FROM FILE: {item.fileName || 'N/A'} (PAGE {item.pageNum}):
                          </div>
                          <pre style={{
                            whiteSpace: "pre-wrap",
                            background: "var(--bg-primary)",
                            padding: "10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                            maxHeight: "150px",
                            overflowY: "auto",
                            border: "1px solid var(--border-color)",
                            fontFamily: "monospace",
                            textAlign: "left"
                          }}>{item.pageText}</pre>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderTop: "1px solid var(--border-color)", background: "rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                <span>Valid orders to import: </span>
                <strong style={{ color: "var(--success)", fontSize: "14px" }}>
                  {parsedOrders.filter(item => !item.isDuplicate && item.productId).length}
                </strong>
                <span> / {parsedOrders.length} total. (Duplicate and unmatched rows will be skipped).</span>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setPreviewModalOpen(false); setParsedOrders([]); }}
                  style={{ height: "40px" }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleImportParsedOrders}
                  style={{ height: "40px", padding: "0 24px" }}
                  disabled={pdfParsing || parsedOrders.filter(item => !item.isDuplicate && item.productId).length === 0}
                >
                  {pdfParsing ? "Importing..." : `Import ${parsedOrders.filter(item => !item.isDuplicate && item.productId).length} Orders`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation and Alert Modals */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Order Row"
        message="Are you sure you want to delete this order entry from the sales ledger? This action cannot be undone."
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
        isOpen={bulkDeleteConfirmOpen}
        title="Delete Selected Orders"
        message={`Are you sure you want to delete the ${selectedOrderIds.length} selected order entries from the sales ledger? This action cannot be undone.`}
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => {
          setBulkDeleteConfirmOpen(false);
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

export default Ledger;
