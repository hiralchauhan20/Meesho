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

// Bulk Delete Investments
export const bulkDeleteInvestments = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid investment IDs" });
    }

    const userId = req.user.id;

    const result = await Investment.deleteMany({
      _id: { $in: ids },
      userId
    });

    res.status(200).json({
      message: `${result.deletedCount} investments deleted successfully`,
      deletedCount: result.deletedCount
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
  
  // Strip cup size letters (A, B, C, D) after chest size numbers (e.g. 32A -> 32, 34B -> 34)
  base = base.replace(/\b(\d{2})\s*[a-d]\b/gi, "$1");

  return base || name.trim();
};

// Normalize product name for matching (handles typos like shapware -> shapewear, megical -> magical)
const normalizeKey = (str) => {
  if (!str) return "";
  let cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.includes("thankyoucard") || cleaned.includes("thankyou") || cleaned.includes("thankcard") || cleaned.includes("thankucard") || cleaned.includes("thankscard")) {
    return "thankyoucard";
  }
  if (cleaned.includes("megical") || cleaned.includes("magical") || cleaned.includes("magicbra")) {
    return "magicalbra";
  }
  if (cleaned.includes("airbra")) {
    return "airbra";
  }

  // Shapewear items MUST contain shape/wear/body
  if (cleaned.includes("shape") || cleaned.includes("wear") || cleaned.includes("body")) {
    if (cleaned.includes("blackandcream") || (cleaned.includes("black") && cleaned.includes("cream"))) {
      return "shapewearblackandcream";
    }
    if (cleaned.includes("black")) {
      return "shapewearblack";
    }
    if (cleaned.includes("cream")) {
      return "shapewearcream";
    }
    return "shapewearblack";
  }

  if (cleaned.includes("meeshomotikothadi") || (cleaned.includes("meesho") && cleaned.includes("moti") && (cleaned.includes("kothadi") || cleaned.includes("bag")))) {
    return "meeshomotikothadi";
  }
  if (cleaned.includes("meeshonanikothadi") || (cleaned.includes("meesho") && cleaned.includes("nani") && (cleaned.includes("kothadi") || cleaned.includes("bag")))) {
    return "meeshonanikothadi";
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

  if (norm === "thankyoucard") {
    return "Thank You Card";
  }
  if (norm === "magicalbra") {
    return "Megical Bra";
  }
  if (norm === "airbra") {
    return "Air Bra";
  }
  if (norm === "shapewearblack") {
    return "Shapewear Black";
  }
  if (norm === "shapewearcream") {
    return "Shapewear Cream";
  }
  if (norm === "shapewearblackandcream") {
    return "Shapewear Black and Cream";
  }
  if (norm === "meeshomotikothadi") {
    return "Meesho Moti Kothadi";
  }
  if (norm === "meeshonanikothadi") {
    return "Meesho Nani Kothadi";
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

const ALL_NET_BRA_COLORS = ["black", "red", "cream", "darkpink", "lightpink", "rubyred"];

const getColorDisplayName = (color) => {
  if (color === "darkpink") return "Darkpink";
  if (color === "lightpink") return "Lightpink";
  if (color === "rubyred") return "Ruby Red";
  return color.charAt(0).toUpperCase() + color.slice(1);
};

// Helper to split Net Bra combo into single colors
const getNetBraColors = (productName) => {
  if (!productName) return ALL_NET_BRA_COLORS;
  const nameLower = productName.toLowerCase();
  const matchedColors = [];

  // 1. Extract parts inside parentheses, if any (e.g. "Net Bra (Ruby Red-DarkPink-Red) Pack of 3")
  const parenMatch = nameLower.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const content = parenMatch[1];
    const segments = content.split(/[+\-,/]/).map(s => s.trim().replace(/[^a-z]/g, ""));
    
    segments.forEach((seg) => {
      if (seg === "rubyred" || seg === "ruby") {
        matchedColors.push("rubyred");
      } else if (seg === "red") {
        matchedColors.push("red");
      } else if (seg === "black") {
        matchedColors.push("black");
      } else if (seg === "cream") {
        matchedColors.push("cream");
      } else if (seg === "darkpink" || seg === "dark") {
        matchedColors.push("darkpink");
      } else if (seg === "lightpink" || seg === "light") {
        matchedColors.push("lightpink");
      }
    });

    if (matchedColors.length > 0) {
      return matchedColors;
    }
  }

  // 2. Check if a single or specific color is explicitly in the product name
  const isRubyRed = nameLower.includes("ruby red") || nameLower.includes("rubyred") || nameLower.includes("ruby");
  const isDarkPink = nameLower.includes("dark pink") || nameLower.includes("darkpink");
  const isLightPink = nameLower.includes("light pink") || nameLower.includes("lightpink");
  const isBlack = nameLower.includes("black");
  const isCream = nameLower.includes("cream");
  const isPlainRed = !isRubyRed && (nameLower.includes(" red") || nameLower.includes("red ") || nameLower.endsWith("red") || nameLower.includes("-red") || nameLower.includes("+red"));

  const detectedColors = [];
  if (isRubyRed) detectedColors.push("rubyred");
  if (isDarkPink) detectedColors.push("darkpink");
  if (isLightPink) detectedColors.push("lightpink");
  if (isBlack) detectedColors.push("black");
  if (isCream) detectedColors.push("cream");
  if (isPlainRed) detectedColors.push("red");

  if (detectedColors.length > 0) {
    return detectedColors;
  }

  // 3. If no specific colors are mentioned (e.g. "Net Bra 28", "Net Bra 28A", "Net Bra Pack of 6 28", "Net Bra 30", etc.)
  // Then it is a set of all 6 colors (Black, Red, Cream, Darkpink, Lightpink, Ruby Red)
  return ALL_NET_BRA_COLORS;
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

      const soldQty = Number(ord.quantity) || 1;
      let packMultiplier = getPackMultiplier(fullPName);

      // A. Product stock deduction
      if (normKey === "shapewearblackandcream") {
        // Combo Pack: 1 Black + 1 Cream per combo
        const blackKey = "shapewearblack";
        const creamKey = "shapewearcream";
        ensureStockEntry(blackKey, "Shapewear Black");
        ensureStockEntry(creamKey, "Shapewear Cream");
        
        stockMap[blackKey].totalSoldPcs += soldQty;
        stockMap[creamKey].totalSoldPcs += soldQty;
      } else {
        const isNetBra = normKey.startsWith("netbra") || normKey.includes("netbra");
        const sizeMatch = normKey.match(/\d{2}/) || fullPName.match(/\b(28|30|32|34|36|38|40)\b/i) || fullPName.match(/(28|30|32|34|36|38|40)/i);
        const chestSize = sizeMatch ? sizeMatch[0] : "";

        if (isNetBra && chestSize) {
          const colors = getNetBraColors(fullPName);
          if (colors.length > 0) {
            colors.forEach((color) => {
              const singleKey = `netbra${color}${chestSize}`;
              const colorDisplay = getColorDisplayName(color);
              const displayName = `Net Bra ${colorDisplay} ${chestSize}`;
              
              ensureStockEntry(singleKey, displayName);
              stockMap[singleKey].totalSoldPcs += soldQty;
            });
            if (colors.length >= 6) {
              packMultiplier = Math.max(packMultiplier, 6);
            }
          } else {
            // Standard deduction fallback
            ensureStockEntry(normKey, canonicalName);
            const actualPcsSold = soldQty * packMultiplier;
            stockMap[normKey].totalSoldPcs += actualPcsSold;
          }
        } else {
          // Standard deduction
          ensureStockEntry(normKey, canonicalName);
          const actualPcsSold = soldQty * packMultiplier;
          stockMap[normKey].totalSoldPcs += actualPcsSold;
        }
      }

      // B. Packaging Materials (Kothadi & Thank You Card) Deduction per order:
      // 1. Meesho Kothadi deduction: Moti (pack >= 6) vs Nani (pack < 6)
      if (packMultiplier >= 6) {
        const meeshoMotiKey = "meeshomotikothadi";
        ensureStockEntry(meeshoMotiKey, "Meesho Moti Kothadi");
        stockMap[meeshoMotiKey].totalSoldPcs += soldQty;
      } else {
        const meeshoNaniKey = "meeshonanikothadi";
        ensureStockEntry(meeshoNaniKey, "Meesho Nani Kothadi");
        stockMap[meeshoNaniKey].totalSoldPcs += soldQty;
      }

      // 2. Always deduct 1 Thank You Card per order
      const thankYouKey = "thankyoucard";
      ensureStockEntry(thankYouKey, "Thank You Card");
      stockMap[thankYouKey].totalSoldPcs += soldQty;

      // 3. Transparent Polybag deduction: Nani (pack <= 3) vs Moti (pack > 3)
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

