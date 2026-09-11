import Shop from "../models/Shop.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

// Get All Shops for logged in user
export const getShops = async (req, res) => {
  try {
    const userId = req.user.id;
    const shops = await Shop.find({ userId }).sort({ isDefault: -1, createdAt: 1 });
    res.status(200).json(shops);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Add New Shop
export const addShop = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shopName, platform, status, description, isDefault } = req.body;

    if (!shopName || !shopName.trim()) {
      return res.status(400).json({ message: "Shop Name is required" });
    }

    const trimmedName = shopName.trim();
    const targetPlatform = platform || "Meesho";

    // Check duplicate shop name on the same platform for user
    const existing = await Shop.findOne({
      userId,
      platform: targetPlatform,
      shopName: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        message: `A shop named "${trimmedName}" already exists on ${targetPlatform}! You can use "${trimmedName}" for another platform (like Flipkart/Amazon), but not twice on ${targetPlatform}.`,
      });
    }

    const totalShops = await Shop.countDocuments({ userId });
    const shouldBeDefault = totalShops === 0 || Boolean(isDefault);

    if (shouldBeDefault) {
      await Shop.updateMany({ userId }, { isDefault: false });
    }

    const newShop = await Shop.create({
      userId,
      shopName: trimmedName,
      platform: targetPlatform,
      status: status || "Active",
      description: description ? description.trim() : "",
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      message: "Shop added successfully",
      shop: newShop,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update Shop
export const updateShop = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { shopName, platform, status, description, isDefault } = req.body;

    const existingShop = await Shop.findOne({ _id: id, userId });
    if (!existingShop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const trimmedName = shopName ? shopName.trim() : existingShop.shopName;
    const targetPlatform = platform || existingShop.platform;

    // Check duplicate shop name on the same platform
    const duplicate = await Shop.findOne({
      userId,
      _id: { $ne: id },
      platform: targetPlatform,
      shopName: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (duplicate) {
      return res.status(400).json({
        message: `Another shop with name "${trimmedName}" already exists on ${targetPlatform}!`,
      });
    }

    // If shop name or platform changed, update linked orders
    if (existingShop.shopName !== trimmedName || existingShop.platform !== targetPlatform) {
      await Order.updateMany(
        { userId, shopName: existingShop.shopName, shopPlatform: existingShop.platform },
        { shopName: trimmedName, shopPlatform: targetPlatform }
      );
    }

    if (isDefault) {
      await Shop.updateMany({ userId, _id: { $ne: id } }, { isDefault: false });
    }

    const updatedShop = await Shop.findOneAndUpdate(
      { _id: id, userId },
      {
        shopName: shopName ? shopName.trim() : existingShop.shopName,
        platform: platform || existingShop.platform,
        status: status || existingShop.status,
        description: description !== undefined ? description.trim() : existingShop.description,
        isDefault: isDefault !== undefined ? isDefault : existingShop.isDefault,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Shop updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete Shop
export const deleteShop = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingShop = await Shop.findOne({ _id: id, userId });
    if (!existingShop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const totalShops = await Shop.countDocuments({ userId });
    if (totalShops <= 1) {
      return res.status(400).json({
        message: "You must have at least one active shop in your account. You cannot delete all shops.",
      });
    }

    await Shop.findOneAndDelete({ _id: id, userId });

    // If deleted shop was default, make the oldest remaining shop default
    if (existingShop.isDefault) {
      const nextShop = await Shop.findOne({ userId }).sort({ createdAt: 1 });
      if (nextShop) {
        nextShop.isDefault = true;
        await nextShop.save();
      }
    }

    res.status(200).json({
      message: "Shop deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
