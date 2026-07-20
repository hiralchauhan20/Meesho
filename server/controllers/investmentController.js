import Investment from "../models/Investment.js";
import Order from "../models/Order.js";

// Add Investment
export const addInvestment = async (req, res) => {
  try {
    const investment = await Investment.create({ ...req.body, userId: req.user.id });

    res.status(201).json({
      message: "Investment Added Successfully",
      investment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get All Investments
export const getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });

    res.status(200).json(investments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update Investment
export const updateInvestment = async (req, res) => {
  try {
    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    if (!investment) {
      return res.status(404).json({
        message: "Investment not found",
      });
    }

    res.status(200).json({
      message: "Investment Updated Successfully",
      investment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete Investment
export const deleteInvestment = async (req, res) => {
  try {
    const investment = await Investment.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!investment) {
      return res.status(404).json({
        message: "Investment not found",
      });
    }

    res.status(200).json({
      message: "Investment Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Extract pack multiplier from product name (e.g. "Air Bra (Pack of 3)" -> 3, "Pack of 6" -> 6)
const getPackMultiplier = (name) => {
  if (!name) return 1;
  const str = name.toLowerCase();
  
  // Regex to match "pack of 3", "3 pack", "pack 3", "set of 3", "3 pcs" etc.
  const match = str.match(/pack\s*of\s*(\d+)|(\d+)\s*pack|pack\s*(\d+)|set\s*of\s*(\d+)|(\d+)\s*pcs/i);
  if (match) {
    const num = match[1] || match[2] || match[3] || match[4] || match[5];
    if (num && !isNaN(num)) {
      return parseInt(num, 10);
    }
  }
  return 1;
};

// Extract base product name without pack specifications (e.g. "Air Bra (Pack of 3)" -> "Air Bra")
const getBaseProductName = (name) => {
  if (!name) return "";
  let base = name
    .replace(/\(?\s*pack\s*of\s*\d+\s*\)?/gi, "")
    .replace(/\(?\s*\d+\s*pack\s*\)?/gi, "")
    .replace(/\(?\s*pack\s*\d+\s*\)?/gi, "")
    .replace(/\(?\s*set\s*of\s*\d+\s*\)?/gi, "")
    .replace(/\(?\s*\d+\s*pcs\s*\)?/gi, "")
    .replace(/\(\s*\)/g, "")
    .trim();
  return base || name.trim();
};

// Normalize product name for matching (handles typos like shapware -> shapewear, megical -> magical)
const normalizeKey = (str) => {
  if (!str) return "";
  let cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.includes("megical") || cleaned.includes("magical") || cleaned.includes("magicbra")) {
    return "magicalbra";
  }
  if (cleaned.includes("airbra")) {
    return "airbra";
  }
  if (cleaned.includes("shapware") || cleaned.includes("shapewear") || cleaned.includes("shape")) {
    return "shapewear";
  }
  if (cleaned.includes("meeshokothadi") || cleaned.includes("meeshobag") || (cleaned.includes("meesho") && cleaned.includes("kothadi"))) {
    return "meeshokothadi";
  }
  if (cleaned.includes("nanitransparent") || cleaned.includes("nanikothadi")) {
    return "nanitransparentkothadi";
  }
  if (cleaned.includes("motitransparent") || cleaned.includes("motikothadi")) {
    return "motitransparentkothadi";
  }
  return cleaned;
};

// Get standardized display name
const getCanonicalProductName = (name) => {
  if (!name) return "";
  const base = getBaseProductName(name);
  const norm = normalizeKey(base);

  if (norm === "magicalbra") {
    return "Megical Bra";
  }
  if (norm === "airbra") {
    return "Air Bra";
  }
  if (norm === "shapewear") {
    return "Shapewear";
  }
  if (norm === "meeshokothadi") {
    return "Meesho Kothadi";
  }
  if (norm === "nanitransparentkothadi") {
    return "Nani Transparent Kothadi";
  }
  if (norm === "motitransparentkothadi") {
    return "Moti Transparent Kothadi";
  }
  return base.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

// Get Live Stock Summary by Product
export const getStockSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const investments = await Investment.find({ userId });
    const orders = await Order.find({ userId });

    const stockMap = {};

    // Helper to initialize stock entry
    const ensureStockEntry = (key, displayName) => {
      if (!stockMap[key]) {
        stockMap[key] = {
          productName: displayName,
          totalPurchasedPcs: 0,
          totalPurchasedDozens: 0,
          totalCost: 0,
          totalSoldPcs: 0,
          unitType: "Pcs"
        };
      }
    };

    // 1. Process Investments (Group strictly by Canonical Product Name)
    investments.forEach((inv) => {
      if (!inv.productName) return;
      
      const canonicalName = getCanonicalProductName(inv.productName);
      const normKey = normalizeKey(canonicalName);
      if (!normKey) return;

      ensureStockEntry(normKey, canonicalName);
      stockMap[normKey].unitType = inv.unitType || "Dozen";

      const qty = Number(inv.quantity) || 0;
      let pcs = qty;
      if (inv.unitType === "Dozen") {
        pcs = qty * 12;
        stockMap[normKey].totalPurchasedDozens += qty;
      }
      stockMap[normKey].totalPurchasedPcs += pcs;
      stockMap[normKey].totalCost += Number(inv.price) || 0;
    });

    // 2. Process Orders (sales) - Product stock + Automatic Packaging Kothadi deduction
    orders.forEach((ord) => {
      const fullPName = ord.productName || ord.productId?.productName;
      if (!fullPName) return;

      // Exclude Cancelled or RTO Returned orders from stock consumption
      if (ord.paymentStatus === "Cancel" || ord.paymentStatus === "RTO Returned") {
        return;
      }

      const canonicalName = getCanonicalProductName(fullPName);
      const normKey = normalizeKey(canonicalName);
      if (!normKey) return;

      ensureStockEntry(normKey, canonicalName);

      const soldQty = Number(ord.quantity) || 1;
      const packMultiplier = getPackMultiplier(fullPName);
      const actualPcsSold = soldQty * packMultiplier;

      // A. Product stock deduction
      stockMap[normKey].totalSoldPcs += actualPcsSold;

      // B. Packaging Bags (Kothadi) Deduction per order:
      // 1. Always deduct 1 Meesho Kothadi per order
      const meeshoKey = "meeshokothadi";
      ensureStockEntry(meeshoKey, "Meesho Kothadi");
      stockMap[meeshoKey].totalSoldPcs += soldQty;

      // 2. Transparent Polybag deduction: Nani (<=3 pack) vs Moti (>3 pack)
      if (packMultiplier <= 3) {
        const naniKey = "nanitransparentkothadi";
        ensureStockEntry(naniKey, "Nani Transparent Kothadi");
        stockMap[naniKey].totalSoldPcs += soldQty;
      } else {
        const motiKey = "motitransparentkothadi";
        ensureStockEntry(motiKey, "Moti Transparent Kothadi");
        stockMap[motiKey].totalSoldPcs += soldQty;
      }
    });

    // 3. Format results with stock status
    const stockList = Object.values(stockMap).map((item) => {
      const remainingPcs = item.totalPurchasedPcs - item.totalSoldPcs;
      const remainingDozens = parseFloat((remainingPcs / 12).toFixed(1));

      let status = "IN_STOCK";
      if (remainingPcs <= 0) {
        status = "OUT_OF_STOCK";
      } else if (remainingPcs <= 5) {
        status = "LOW_STOCK";
      }

      return {
        ...item,
        remainingPcs,
        remainingDozens,
        status
      };
    });



    // Sort: OUT_OF_STOCK first, LOW_STOCK second, then IN_STOCK
    const priority = { OUT_OF_STOCK: 0, LOW_STOCK: 1, IN_STOCK: 2 };
    stockList.sort((a, b) => {
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }
      return a.productName.localeCompare(b.productName);
    });

    res.status(200).json(stockList);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

