import Shop from "../models/Shop.js";
import Order from "../models/Order.js";

// Get All Shops for logged in user (auto-seeds HKC Collection if none exist)
export const getShops = async (req, res) => {
  try {
    const userId = req.user.id;
    let shops = await Shop.find({ userId }).sort({ isDefault: -1, createdAt: 1 });

    // Auto-create default "HKC Collection" if user has no shops registered yet
    if (shops.length === 0) {
      const defaultShop = await Shop.create({
        userId,
        shopName: "HKC Collection",
        platform: "Meesho",
        status: "Active",
        description: "Primary default shop account",
        isDefault: true,
      });
      shops = [defaultShop];
    }

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

    // Check duplicate shop name for user
    const existing = await Shop.findOne({
      userId,
      shopName: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        message: `A shop named "${trimmedName}" already exists! Please use a unique shop name.`,
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
      platform: platform || "Meesho",
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

    if (shopName && shopName.trim()) {
      const trimmedName = shopName.trim();
      const duplicate = await Shop.findOne({
        userId,
        _id: { $ne: id },
        shopName: { $regex: new RegExp(`^${trimmedName}$`, "i") },
      });

      if (duplicate) {
        return res.status(400).json({
          message: `Another shop with name "${trimmedName}" already exists!`,
        });
      }

      // If shop name changed, optionally update linked orders
      if (existingShop.shopName !== trimmedName) {
        await Order.updateMany(
          { userId, shopName: existingShop.shopName },
          { shopName: trimmedName, shopPlatform: platform || existingShop.platform }
        );
      }
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
