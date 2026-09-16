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
      const loss = (o.lossAmount !== undefined && o.lossAmount !== null && o.lossAmount !== "")
        ? Number(o.lossAmount)
        : 0;
      return claimAmt - 157 - loss;
    }
    return -157;
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
  const initialPlatformParam = searchParams.get("platform") || "All";

  const [orders, setOrders] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search / Filter states
  const [filterShop, setFilterShop] = useState(initialShopParam);
  const [filterPlatform, setFilterPlatform] = useState(initialPlatformParam);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCourier, setFilterCourier] = useState("");
  const [filterCustomerState, setFilterCustomerState] = useState("");
  const [filterOrderNo, setFilterOrderNo] = useState("");

  useEffect(() => {
    const shopParam = searchParams.get("shop");
    const platformParam = searchParams.get("platform");
    if (shopParam) {
      setFilterShop(shopParam);
    }
    if (platformParam) {
      setFilterPlatform(platformParam);
    } else if (!shopParam) {
      setFilterPlatform("All");
    }
  }, [searchParams]);

  useEffect(() => {
    if (filterShop) {
      const matched = shops.find(s => 
        (s.shopName || "").toLowerCase() === filterShop.trim().toLowerCase() &&
        (filterPlatform === "All" || (s.platform || "").toLowerCase() === filterPlatform.trim().toLowerCase())
      ) || shops.find(s => (s.shopName || "").toLowerCase() === filterShop.trim().toLowerCase());

      localStorage.setItem("currentViewingShop", JSON.stringify({
        shopName: filterShop,
        platform: matched?.platform || (filterPlatform !== "All" ? filterPlatform : "")
      }));
      window.dispatchEvent(new Event("shopChange"));
    }
  }, [filterShop, filterPlatform, shops]);

  useEffect(() => {
    if (filterShop && filterShop !== "All") {
      setShopName(filterShop);
      setPdfSelectedShop(filterShop);
      const matched = shops.find(s => 
        (s.shopName || "").toLowerCase() === filterShop.trim().toLowerCase() &&
        (filterPlatform === "All" || (s.platform || "").toLowerCase() === filterPlatform.trim().toLowerCase())
      ) || shops.find(s => (s.shopName || "").toLowerCase() === filterShop.trim().toLowerCase());

      if (matched) {
        setShopPlatform(matched.platform || "Meesho");
      }
    }
  }, [filterShop, filterPlatform, shops]);

  const currentShopInfo = useMemo(() => {
    if (!filterShop || filterShop === "All") return null;
    return shops.find(s => (s.shopName || "").toLowerCase() === filterShop.trim().toLowerCase());
  }, [filterShop, shops]);

  const currentShopStyle = useMemo(() => {
    if (!currentShopInfo) return null;
    return getPlatformStyle(currentShopInfo.platform);
  }, [currentShopInfo]);

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
  const [editLossAmount, setEditLossAmount] = useState("");

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
  const getStateFromPincode = (pincodeStr) => {
    if (!pincodeStr || typeof pincodeStr !== "string") return null;
    const pin = parseInt(pincodeStr.replace(/\D/g, ""), 10);
    if (isNaN(pin) || pin < 110000 || pin > 999999) return null;

    const prefix2 = Math.floor(pin / 10000);
    const prefix3 = Math.floor(pin / 1000);

    if (prefix2 === 11) return "Delhi";
    if (prefix2 >= 12 && prefix2 <= 13) return "Haryana";
    if (prefix2 >= 14 && prefix2 <= 15) return "Punjab";
    if (prefix2 === 16) return "Chandigarh";
    if (prefix2 === 17) return "Himachal Pradesh";
    if (prefix2 >= 18 && prefix2 <= 19) return "Jammu & Kashmir";
    
    if (prefix3 >= 246 && prefix3 <= 249) return "Uttarakhand";
    if (prefix3 >= 262 && prefix3 <= 263) return "Uttarakhand";
    if (prefix2 >= 20 && prefix2 <= 28) return "Uttar Pradesh";

    if (prefix2 >= 30 && prefix2 <= 34) return "Rajasthan";
    if (prefix2 >= 36 && prefix2 <= 39) return "Gujarat";

    if (prefix3 === 403) return "Goa";
    if (prefix2 >= 40 && prefix2 <= 44) return "Maharashtra";

    if (prefix2 >= 45 && prefix2 <= 48) return "Madhya Pradesh";
    if (prefix2 === 49) return "Chhattisgarh";

    if (prefix2 === 50) return "Telangana";
    if (prefix2 >= 51 && prefix2 <= 53) return "Andhra Pradesh";

    if (prefix2 >= 56 && prefix2 <= 59) return "Karnataka";

    if (prefix2 >= 60 && prefix2 <= 64) return "Tamil Nadu";
    if (prefix2 >= 67 && prefix2 <= 69) return "Kerala";

    if (prefix3 === 744) return "Other UT";
    if (prefix2 >= 70 && prefix2 <= 74) return "West Bengal";

    if (prefix2 >= 75 && prefix2 <= 77) return "Odisha";
    if (prefix2 === 78) return "Assam";

    if (prefix3 >= 790 && prefix3 <= 792) return "Arunachal Pradesh";
    if (prefix3 >= 793 && prefix3 <= 794) return "Meghalaya";
    if (prefix3 === 795) return "Manipur";
    if (prefix3 === 796) return "Mizoram";
    if (prefix3 >= 797 && prefix3 <= 798) return "Nagaland";
    if (prefix3 === 799) return "Tripura";
    if (prefix3 === 737) return "Sikkim";

    if ((prefix2 >= 81 && prefix2 <= 83) || (prefix3 >= 814 && prefix3 <= 835)) return "Jharkhand";
    if (prefix2 >= 80 && prefix2 <= 85) return "Bihar";

    return null;
  };

  // Helper matching functions for PDF Label Import
  const autoMatchProduct = (text, productsList) => {
    if (!productsList || productsList.length === 0 || !text) return null;

    const pageLower = text.toLowerCase();
    
    // Normalize strings (remove all non-alphanumeric)
    const cleanStr = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const normPage = cleanStr(pageLower);

    // 1. Direct exact / normalized match
    for (const p of productsList) {
      const normPName = cleanStr(p.productName);
      if (normPName && normPage.includes(normPName)) {
        return p;
      }
    }

    // 2. Extract Key Features from Label Text:
    // (A) Product Family
    const isMegical = /\b(?:megical|magical|magic)\b/i.test(pageLower);
    const isNetBra = /\b(?:net\s*bra|netbra|net)\b/i.test(pageLower) || /\bnb\b/i.test(pageLower);
    const isShapewear = /\b(?:shapewear|shape\s*wear|tummy)\b/i.test(pageLower);
    const isAirBra = !isMegical && !isNetBra && !isShapewear && (/\b(?:air\s*bra|airbra|sports?\s*bra|cotton\s*full\s*coverage)\b/i.test(pageLower) || /\bab\b/i.test(pageLower));

    // (B) Pack Count
    let extractedPack = null;
    if (/\b(?:pack\s*(?:of)?\s*6|6\s*(?:pack|pk|pcs|pc|set))\b/i.test(pageLower) || /\b6pk\b/i.test(pageLower) || /\b6\s*[-_]\s*[a-z]/i.test(pageLower)) {
      extractedPack = 6;
    } else if (/\b(?:pack\s*(?:of)?\s*3|3\s*(?:pack|pk|pcs|pc|set))\b/i.test(pageLower) || /\b3pk\b/i.test(pageLower) || /\b3\s*[-_]\s*[a-z]/i.test(pageLower)) {
      extractedPack = 3;
    } else if (/\b(?:pack\s*(?:of)?\s*2|2\s*(?:pack|pk|pcs|pc|set))\b/i.test(pageLower) || /\b2pk\b/i.test(pageLower) || /\b2\s*[-_]\s*[a-z]/i.test(pageLower)) {
      extractedPack = 2;
    }

    // (C) Size & Cup (e.g. 34A, 34B, 32A, 28A, 40B, 36A, 38B)
    let extractedSize = null;
    const sizeMatch = pageLower.match(/\b(28|30|32|34|36|38|40)\s*([ab])\b/i) || pageLower.match(/\b(28|30|32|34|36|38|40)([ab])\b/i);
    if (sizeMatch) {
      extractedSize = `${sizeMatch[1]}${sizeMatch[2].toUpperCase()}`;
    }

    // (D) Color clues on page/label
    const hasRuby = /\b(?:ruby|ruby\s*red)\b/i.test(pageLower);
    const hasDarkPink = /\b(?:dark\s*pink|darkpink|dpk)\b/i.test(pageLower);
    const hasLightPink = /\b(?:light\s*pink|lightpink|lpk)\b/i.test(pageLower);
    const hasCream = /\b(?:cream|crm)\b/i.test(pageLower);
    const hasBlack = /\b(?:black|blk)\b/i.test(pageLower);
    const hasRed = /\b(?:red)\b/i.test(pageLower) && !hasRuby;

    // Score each product in the catalog
    let scoredCandidates = [];

    for (const p of productsList) {
      const pName = p.productName;
      const pLower = pName.toLowerCase();
      let score = 0;

      // 1. Check Family
      const pIsMegical = /\b(?:megical|magical|magic)\b/i.test(pLower);
      const pIsNetBra = /\bnet\b/i.test(pLower);
      const pIsAirBra = /\bair\b/i.test(pLower);
      const pIsShapewear = /\bshapewear\b/i.test(pLower);

      if (isMegical) {
        if (pIsMegical) score += 200;
        else score -= 1000;
      } else if (isNetBra) {
        if (pIsNetBra) score += 200;
        else score -= 1000;
      } else if (isShapewear) {
        if (pIsShapewear) score += 200;
        else score -= 1000;
      } else if (isAirBra) {
        if (pIsAirBra) score += 200;
        else score -= 1000;
      }

      // If Net Bra product, but label doesn't mention Net or Cup size (A/B), penalize
      if (pIsNetBra && !isNetBra && !extractedSize) {
        score -= 500;
      }

      // 2. Check Pack Count
      const pPack6 = /\b(?:pack\s*(?:of)?\s*6|6\s*pk|6\s*pcs?)\b/i.test(pLower) || /\b6\b/.test(pLower.replace(/\b(28|30|32|34|36|38|40)[ab]?\b/g, ""));
      const pPack3 = /\b(?:pack\s*(?:of)?\s*3|3\s*pk|3\s*pcs?)\b/i.test(pLower) || /\b3\b/.test(pLower.replace(/\b(28|30|32|34|36|38|40)[ab]?\b/g, ""));
      const pPack2 = /\b(?:pack\s*(?:of)?\s*2|2\s*pk|2\s*pcs?)\b/i.test(pLower);

      if (extractedPack === 6) {
        if (pPack6) score += 100;
        else if (pPack3 || pPack2) score -= 500;
      } else if (extractedPack === 3) {
        if (pPack3) score += 100;
        else if (pPack6 || pPack2) score -= 500;
      } else if (extractedPack === 2) {
        if (pPack2) score += 100;
        else if (pPack6 || pPack3) score -= 500;
      }

      // 3. Check Size & Cup
      const pSizeMatch = pName.match(/\b(28|30|32|34|36|38|40)\s*([ABab])\b/i) || pName.match(/\b(28|30|32|34|36|38|40)([ABab])\b/i);
      const pSize = pSizeMatch ? `${pSizeMatch[1]}${pSizeMatch[2].toUpperCase()}` : null;

      if (extractedSize) {
        if (pSize === extractedSize) {
          score += 200;
        } else if (pSize) {
          score -= 1000; // STRICT size mismatch!
        }
      } else if (pSize) {
        score -= 100;
      }

      // 4. Check Colors on Net Bra & Shapewear
      const pHasRuby = /ruby/i.test(pLower);
      const pHasDarkPink = /dark\s*pink|darkpink/i.test(pLower);
      const pHasLightPink = /light\s*pink|lightpink/i.test(pLower);
      const pHasCream = /cream/i.test(pLower);
      const pHasBlack = /black/i.test(pLower);
      const pHasRed = /\bred\b/i.test(pLower) && !pHasRuby;

      if (pHasRuby) {
        if (hasRuby) score += 100;
        else score -= 200;
      }
      if (pHasDarkPink) {
        if (hasDarkPink) score += 80;
        else score -= 150;
      }
      if (pHasLightPink) {
        if (hasLightPink) score += 80;
        else score -= 150;
      }
      if (pHasCream) {
        if (hasCream) score += 40;
      }
      if (pHasBlack) {
        if (hasBlack) score += 40;
      }
      if (pHasRed) {
        if (hasRed) score += 40;
        else score -= 100;
      }

      if (isShapewear) {
        if (hasBlack && hasCream) {
          if (/black.*cream|cream.*black/i.test(pLower)) score += 100;
          else score -= 50;
        } else if (hasBlack) {
          if (/black/i.test(pLower) && !/cream/i.test(pLower)) score += 100;
          else score -= 50;
        } else if (hasCream) {
          if (/cream/i.test(pLower) && !/black/i.test(pLower)) score += 100;
          else score -= 50;
        }
      }

      // General token overlap
      const tokens = pLower.split(/[^a-z0-9]+/).filter(t => t.length > 1 && !["pack", "of", "the", "and", "in", "bra"].includes(t));
      for (const tok of tokens) {
        if (pageLower.includes(tok)) {
          score += 10;
        }
      }

      if (score > 50) {
        scoredCandidates.push({ product: p, score });
      }
    }

    scoredCandidates.sort((a, b) => b.score - a.score);

    if (scoredCandidates.length > 0) {
      return scoredCandidates[0].product;
    }

    return null;
  };

  const extractCourierPartner = (text) => {
    const t = text.toLowerCase().replace(/\s+/g, "");
    if (t.includes("delhivery")) return "Delhivery";
    if (t.includes("shadowfax")) return "Shadowfax";
    if (t.includes("xpressbees") || t.includes("expressbees")) return "Xpressbees";
    if (t.includes("valmo")) return "Valmo";
    return "Valmo";
  };

  const extractCustomerState = (text, statesList = INDIA_STATES) => {
    if (!text) return "Gujarat";

    // 1. Separate customer section from seller return section
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    let customerLines = [];
    let isReturnSection = false;

    for (const line of lines) {
      if (/if\s*undelivered|return\s*to|sold\s*by|seller\s*details/i.test(line)) {
        isReturnSection = true;
      }
      if (!isReturnSection) {
        customerLines.push(line);
      }
    }

    const customerText = customerLines.length > 0 ? customerLines.join("\n") : text;

    const stateRegexes = [
      { state: "Andhra Pradesh", regex: /\b(?:andhra\s*pradesh|andhra|\bap\b)\b/i },
      { state: "Arunachal Pradesh", regex: /\b(?:arunachal\s*pradesh|arunachal)\b/i },
      { state: "Assam", regex: /\b(?:assam|\bas\b)\b/i },
      { state: "Bihar", regex: /\b(?:bihar|\bbr\b)\b/i },
      { state: "Chandigarh", regex: /\b(?:chandigarh|\bch\b)\b/i },
      { state: "Chhattisgarh", regex: /\b(?:chhattisgarh|chhatisgarh|chattisgarh|\bcg\b|\bct\b)\b/i },
      { state: "Goa", regex: /\b(?:goa|\bga\b)\b/i },
      { state: "Gujarat", regex: /\b(?:gujarat|\bgj\b)\b/i },
      { state: "Haryana", regex: /\b(?:haryana|\bhr\b)\b/i },
      { state: "Himachal Pradesh", regex: /\b(?:himachal\s*pradesh|himachal|\bhp\b)\b/i },
      { state: "Jharkhand", regex: /\b(?:jharkhand|\bjh\b)\b/i },
      { state: "Karnataka", regex: /\b(?:karnataka|\bka\b)\b/i },
      { state: "Kerala", regex: /\b(?:kerala|\bkl\b)\b/i },
      { state: "Madhya Pradesh", regex: /\b(?:madhya\s*pradesh|\bmp\b)\b/i },
      { state: "Maharashtra", regex: /\b(?:maharashtra|\bmh\b)\b/i },
      { state: "Manipur", regex: /\b(?:manipur|\bmn\b)\b/i },
      { state: "Meghalaya", regex: /\b(?:meghalaya|\bml\b)\b/i },
      { state: "Mizoram", regex: /\b(?:mizoram|\bmz\b)\b/i },
      { state: "Nagaland", regex: /\b(?:nagaland|\bnl\b)\b/i },
      { state: "Odisha", regex: /\b(?:odisha|orissa|\bod\b|\bor\b)\b/i },
      { state: "Punjab", regex: /\b(?:punjab|\bpb\b)\b/i },
      { state: "Rajasthan", regex: /\b(?:rajasthan|\brj\b)\b/i },
      { state: "Sikkim", regex: /\b(?:sikkim|\bsk\b)\b/i },
      { state: "Tamil Nadu", regex: /\b(?:tamil\s*nadu|tamilnadu|\btn\b)\b/i },
      { state: "Telangana", regex: /\b(?:telangana|telengana|\bts\b)\b/i },
      { state: "Tripura", regex: /\b(?:tripura|\btr\b)\b/i },
      { state: "Uttar Pradesh", regex: /\b(?:uttar\s*pradesh|\bup\b)\b/i },
      { state: "Uttarakhand", regex: /\b(?:uttarakhand|uttaranchal|\buk\b|\but\b)\b/i },
      { state: "West Bengal", regex: /\b(?:west\s*bengal|bengal|\bwb\b)\b/i },
      { state: "Delhi", regex: /\b(?:delhi|new\s*delhi|\bdl\b)\b/i },
      { state: "Jammu & Kashmir", regex: /\b(?:jammu\s*&?\s*kashmir|kashmir|jammu|\bjk\b)\b/i }
    ];

    // 2. Look for explicit "State: [Name]"
    const stateFieldMatch = customerText.match(/(?:state|state\s*code|destination\s*state)\s*[:\-\s]*([a-zA-Z\s&]+)/i);
    if (stateFieldMatch && stateFieldMatch[1]) {
      const rawState = stateFieldMatch[1].trim();
      for (const item of stateRegexes) {
        if (item.regex.test(rawState)) {
          return item.state;
        }
      }
    }

    // 3. Look for 6-digit destination pincode in the customer section
    const pincodeMatches = customerText.match(/\b([1-9][0-9]{5})\b/g) || [];
    const destPincodes = pincodeMatches.filter(p => p !== "394107");
    if (destPincodes.length > 0) {
      const pinState = getStateFromPincode(destPincodes[0]);
      if (pinState) {
        return pinState;
      }
    }

    // 4. Match full state names with word boundaries in customer lines
    for (const item of stateRegexes) {
      if (item.regex.test(customerText)) {
        return item.state;
      }
    }

    // 5. Look for any 6-digit pincode in the entire page text (excluding 394107)
    const allPins = (text.match(/\b([1-9][0-9]{5})\b/g) || []).filter(p => p !== "394107");
    if (allPins.length > 0) {
      const pinState = getStateFromPincode(allPins[0]);
      if (pinState) {
        return pinState;
      }
    }

    // 6. Non-Gujarat state in full text fallback
    for (const item of stateRegexes) {
      if (item.state !== "Gujarat" && item.regex.test(text)) {
        return item.state;
      }
    }

    if (stateRegexes.find(i => i.state === "Gujarat").regex.test(text)) {
      return "Gujarat";
    }

    return "Gujarat";
  };

  const extractShopName = (text, shopsList = []) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const inlineMatch = line.match(/if\s*undelivered,?\s*return\s*to:?\s*(.+)/i);
      if (inlineMatch && inlineMatch[1].trim()) {
        const candidate = inlineMatch[1].trim().replace(/^[:\-\s]+/, "").split(/[,;\n]/)[0].trim();
        if (candidate) {
          const matched = shopsList.find(s => (s.shopName || "").toLowerCase() === candidate.toLowerCase());
          return matched ? matched.shopName : candidate;
        }
      }
      if (/if\s*undelivered,?\s*return\s*to:?/i.test(line) || /^return\s*to:?/i.test(line)) {
        if (i + 1 < lines.length) {
          const candidate = lines[i + 1].trim().split(/[,;\n]/)[0].trim();
          if (candidate && !candidate.toLowerCase().startsWith("if undelivered") && !candidate.toLowerCase().startsWith("return to")) {
            const matched = shopsList.find(s => (s.shopName || "").toLowerCase() === candidate.toLowerCase());
            return matched ? matched.shopName : candidate;
          }
        }
      }
    }

    for (const s of shopsList) {
      if (s.shopName && s.shopName.trim()) {
        if (text.toLowerCase().includes(s.shopName.toLowerCase().trim())) {
          return s.shopName;
        }
      }
    }
    return "";
  };

  const extractOrderNo = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const ensureSuffix = (val) => {
      if (!val) return "";
      return val.includes("_") ? val : `${val}_1`;
    };

    // 1. Look for explicit "Order No." or "Purchase Order No." line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check line itself having "Order No. 32998..." or "Purchase Order No. 32998..."
      const matchInline = line.match(/(?:purchase\s*order\s*no\.?|order\s*no\.?|order\s*id)\s*[:\s\-]*([0-9]{15,19}(?:_\d+)?)/i);
      if (matchInline && matchInline[1]) {
        return ensureSuffix(matchInline[1]);
      }

      // Check if current line is "Order No." or "Purchase Order No."
      if (/^(?:purchase\s*order\s*no\.?|order\s*no\.?|order\s*id)[:\s\-]?$/i.test(line)) {
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const nextClean = lines[j].replace(/\s+/g, "");
          const nextMatch = nextClean.match(/(3\d{14,18}(?:_\d+)?)/);
          if (nextMatch) {
            return ensureSuffix(nextMatch[1]);
          }
        }
      }
    }

    // 2. Search each line individually for 18-digit Meesho order numbers (e.g. 329987429074634816_1 or 329987429074634816)
    for (const line of lines) {
      const clean = line.replace(/\s+/g, "");
      const m = clean.match(/(3\d{17}(?:_\d+)?)/);
      if (m) return ensureSuffix(m[1]);
    }

    // 3. Search each line individually for any 15-18 digit number starting with 3
    for (const line of lines) {
      const clean = line.replace(/\s+/g, "");
      const m = clean.match(/(3\d{14,17}(?:_\d+)?)/);
      if (m) return ensureSuffix(m[1]);
    }

    return "";
  };

  const extractAwbId = (text, orderNo, courier) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const orderBase = (orderNo || "").split("_")[0];

    const isValidAwb = (val) => {
      if (!val) return false;
      const clean = val.replace(/\s+/g, "");
      if (!clean) return false;
      if (clean === orderNo || clean === orderBase || (orderBase && clean.includes(orderBase)) || (orderBase && orderBase.includes(clean))) return false;
      if (clean.includes("394107") || clean.includes("4512757")) return false; // Return code / facility code
      if (/^[6-9]\d{9}$/.test(clean)) return false; // 10-digit Indian mobile number
      if (/^\d{6}$/.test(clean)) return false; // 6-digit Indian pincode
      if (clean.length < 8) return false;
      const lower = clean.toLowerCase();
      if (lower.includes("invoice") || lower.includes("order") || lower.includes("logistics") || lower.includes("reverse") || lower.includes("charge")) return false;
      return true;
    };

    // 1. Explicit keywords in lines: AWB / Tracking No / Waybill
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\b(?:awb(?:\s*no\.?)?|tracking\s*(?:no\.?|id)|waybill)\b\s*[:\s\-]*([a-zA-Z0-9_\-\/]+)/i);
      if (match && isValidAwb(match[1])) {
        return match[1];
      }
    }

    // 2. Specific carrier formats:
    // Valmo: VL followed by 10-15 digits
    for (const line of lines) {
      const clean = line.replace(/\s+/g, "");
      const m = clean.match(/(VL\d{10,15})/i);
      if (m && isValidAwb(m[1])) return m[1].toUpperCase();
    }

    // Shadowfax: SF followed by digits + chars (e.g. SF4000508476FPL)
    for (const line of lines) {
      const clean = line.replace(/\s+/g, "");
      const m = clean.match(/(SF[a-zA-Z0-9]{10,16})/i);
      if (m && isValidAwb(m[1])) return m[1].toUpperCase();
    }

    // Delhivery / Xpressbees / Ecom Waybills:
    // Pure 12-to-16 digit numbers on their own line (like 1490841081343832 or 134096137723799)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const clean = line.replace(/\s+/g, "");
      if (/^\d{12,16}$/.test(clean) && isValidAwb(clean)) {
        return clean;
      }
    }

    // Alphanumeric AWB (e.g. standard tracking codes with digits and chars)
    for (const line of lines) {
      const clean = line.replace(/\s+/g, "");
      const m = clean.match(/\b([a-zA-Z0-9]{12,16})\b/);
      if (m && isValidAwb(m[1]) && /\d{6,}/.test(m[1])) {
        return m[1];
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
    const normalized = text.replace(/\s*([\.\-\/])\s*/g, "$1");
    const lines = normalized.split("\n").map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateMatchInline = line.match(/(?:order\s*date|invoice\s*date|date)[:\s\-]*\b(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})\b/i);
      if (dateMatchInline) {
        const [_, day, month, year] = dateMatchInline;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }

      if (/^(?:order\s*date|invoice\s*date|date)$/i.test(line)) {
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextMatch = lines[j].match(/\b(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})\b/);
          if (nextMatch) {
            const [_, day, month, year] = nextMatch;
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
        }
      }
    }

    const generalMatch = normalized.match(/\b(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})\b/);
    if (generalMatch) {
      const [_, day, month, year] = generalMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

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
      let detectedShopFromPdf = "";

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

          if (!detectedShopFromPdf) {
            const detected = extractShopName(pageText, shops);
            if (detected) {
              detectedShopFromPdf = detected;
            }
          }

          const orderNoMatch = extractOrderNo(pageText);
          const courier = extractCourierPartner(pageText);
          const awbIdMatch = extractAwbId(pageText, orderNoMatch, courier);
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

      if (detectedShopFromPdf) {
        setPdfSelectedShop(detectedShopFromPdf);
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
    setEditLossAmount(o.lossAmount !== undefined && o.lossAmount !== null && o.lossAmount > 0 ? String(o.lossAmount) : "");
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
        lossAmount: Number(editLossAmount) >= 0 ? Number(editLossAmount) : 0,
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

    const matchedProduct = products.find(
      (p) => p.productName.toLowerCase().trim() === value.toLowerCase().trim()
    );
    if (matchedProduct) {
      setProductId(matchedProduct._id);
      setPurchasePrice(String(matchedProduct.purchasePrice));
      setSellingPrice(String(matchedProduct.sellingPrice));
      setGst(String(matchedProduct.gst || 18));
    } else {
      setProductId("");
    }
  };

  const handleEditProductSelect = (value) => {
    setEditProductName(value);

    const matchedProduct = products.find(
      (p) => p.productName.toLowerCase().trim() === value.toLowerCase().trim()
    );
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
        if (o.claimStatus === "Approved") {
          const loss = (o.lossAmount !== undefined && o.lossAmount !== null && o.lossAmount !== "") ? Number(o.lossAmount) : 0;
          totalReturnCost += (157 + loss - claimAmt);
        } else {
          totalReturnCost += 157;
        }
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
        const orderShop = (o.shopName || "").trim().toLowerCase();
        if (orderShop !== filterShop.trim().toLowerCase()) return false;

        if (filterPlatform && filterPlatform !== "All") {
          const orderPlatform = (o.shopPlatform || "").trim().toLowerCase();
          if (orderPlatform && orderPlatform !== filterPlatform.trim().toLowerCase()) return false;
        }
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
        if (o.claimStatus === "Approved") {
          const loss = (o.lossAmount !== undefined && o.lossAmount !== null && o.lossAmount !== "") ? Number(o.lossAmount) : 0;
          totalReturnCost += (157 + loss - claimAmt);
        } else {
          totalReturnCost += 157;
        }
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

  const hasFilter = (filterShop && filterShop !== "All") || (filterPlatform && filterPlatform !== "All") || filterDate || filterStatus || filterProduct || filterCourier || filterCustomerState || filterOrderNo.trim();
  const clearFilters = () => {
    setFilterShop("All");
    setFilterPlatform("All");
    setFilterProduct("");
    setFilterDate("");
    setFilterStatus("");
    setFilterCourier("");
    setFilterCustomerState("");
    setFilterOrderNo("");
    setSearchParams({});
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
              value={filterShop === "All" ? "All" : (filterPlatform !== "All" ? `${filterShop}|||${filterPlatform}` : filterShop)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "All") {
                  setFilterShop("All");
                  setFilterPlatform("All");
                  setSearchParams({});
                } else if (val.includes("|||")) {
                  const [sName, sPlatform] = val.split("|||");
                  setFilterShop(sName);
                  setFilterPlatform(sPlatform);
                  setSearchParams({ shop: sName, platform: sPlatform });
                } else {
                  setFilterShop(val);
                  setFilterPlatform("All");
                  setSearchParams({ shop: val });
                }
              }}
              style={{ height: "38px", fontSize: "13px", padding: "0 12px" }}
            >
              <option value="All">All Shops</option>
              {shops.map((s) => (
                <option key={s._id} value={`${s.shopName}|||${s.platform}`}>
                  {s.shopName} ({s.platform})
                </option>
              ))}
              {Array.from(new Set(orders.map(o => o.shopName).filter(Boolean)))
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
            <div style={{ position: "relative" }}>
              <input
                type="text"
                list="ledgerProductsDatalist"
                placeholder="Type or select product (e.g. Net Bra, Shapewear...)"
                value={productName}
                onChange={(e) => handleProductSelect(e.target.value)}
                required
                style={{ width: "100%", paddingRight: productName ? "32px" : "12px" }}
                autoComplete="off"
              />
              <datalist id="ledgerProductsDatalist">
                {products.map((p) => (
                  <option key={p._id} value={p.productName} />
                ))}
                {products.length === 0 && (
                  <>
                    <option value="Air Bra (Pack of 3)" />
                    <option value="Air Bra (Pack of 6)" />
                    <option value="Megical Bra (Pack of 3)" />
                    <option value="Megical Bra (Pack of 6)" />
                    <option value="Shapewear Black" />
                    <option value="Shapewear Cream" />
                    <option value="Shapewear Black and Cream (Pack of 2)" />
                  </>
                )}
              </datalist>
              {productName && (
                <button
                  type="button"
                  onClick={() => handleProductSelect("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "2px"
                  }}
                  title="Clear product name"
                >
                  ✕
                </button>
              )}
            </div>
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
                        {o.paymentStatus === "Wrong Return" && o.lossAmount > 0 && (
                          <div style={{ fontSize: "10px", color: "var(--danger)", marginTop: "2px", fontWeight: "600" }}>
                            Loss: ₹{o.lossAmount}
                          </div>
                        )}
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
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: "650px", 
              maxHeight: "90vh", 
              padding: 0, 
              display: "flex", 
              flexDirection: "column", 
              overflow: "hidden" 
            }}
          >
            <div className="modal-header" style={{ padding: "18px 24px", margin: 0, borderBottom: "1px solid var(--border-color)" }}>
              <h3 className="modal-title">Edit Sale Transaction</h3>
              <button className="modal-close" onClick={() => setEditingOrder(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div 
                className="form-grid" 
                style={{ 
                  padding: "20px 24px", 
                  overflowY: "auto", 
                  flex: 1, 
                  maxHeight: "calc(90vh - 140px)" 
                }}
              >
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
                  </select>
                </div>
                <div className="form-full">
                  <label>Product Name</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      list="editProductsDatalist"
                      placeholder="Type or select product..."
                      value={editProductName}
                      onChange={(e) => handleEditProductSelect(e.target.value)}
                      required
                      style={{ width: "100%", paddingRight: editProductName ? "32px" : "12px" }}
                      autoComplete="off"
                    />
                    <datalist id="editProductsDatalist">
                      {products.map((p) => (
                        <option key={p._id} value={p.productName} />
                      ))}
                    </datalist>
                    {editProductName && (
                      <button
                        type="button"
                        onClick={() => handleEditProductSelect("")}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "14px",
                          padding: "2px"
                        }}
                        title="Clear product name"
                      >
                        ✕
                      </button>
                    )}
                  </div>
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
                {editPaymentStatus === "Wrong Return" && (
                  <div className="form-full">
                    <label>
                      Product Damage / Loss Amount (₹)
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "normal", marginLeft: "6px" }}>
                        (જેટલું નુકસાન થયું હોય તે રકમ - Default: પૂરી ખરીદ કિંમત)
                      </span>
                    </label>
                    <input 
                      type="number" 
                      value={editLossAmount} 
                      onChange={(e) => setEditLossAmount(e.target.value)} 
                      placeholder="દા.ત. ₹200 (6 માંથી 2 ખોવાયા તો 2 નંગનું નુકસાન)"
                      min="0" 
                      step="0.01" 
                    />
                  </div>
                )}

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
              <div className="modal-footer" style={{ padding: "16px 24px", margin: 0, borderTop: "1px solid var(--border-color)", background: "rgba(0,0,0,0.1)" }}>
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
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "110px" }}>File / Page</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "125px" }}>Date</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "140px" }}>Order ID</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "130px" }}>AWB ID</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "100px" }}>Courier</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", width: "120px" }}>State</th>
                    <th style={{ padding: "10px 8px", textAlign: "left" }}>Product Match (Select correct product)</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", width: "55px" }}>Qty</th>
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
                            type="date" 
                            value={item.date || ""} 
                            onChange={(e) => handleParsedFieldChange(item.tempId, "date", e.target.value)} 
                            style={{ height: "30px", fontSize: "12px", padding: "0 4px", width: "100%", background: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
                          />
                        </td>
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
                          <td colSpan="10" style={{ padding: "12px 20px" }}>
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
