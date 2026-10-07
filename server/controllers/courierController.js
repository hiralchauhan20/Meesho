import Courier from "../models/Courier.js";
import Order from "../models/Order.js";

const DEFAULT_COURIERS = ["Valmo", "Xpressbees", "Shadowfax", "Delhivery"];

// Get All Courier Partners for the logged-in user
export const getCouriers = async (req, res) => {
  try {
    const userId = req.user.id;
    let couriers = await Courier.find({ userId }).sort({ createdAt: 1 });

    // If first time user has no custom couriers, seed default couriers
    if (couriers.length === 0) {
      const seedDocs = DEFAULT_COURIERS.map((name, idx) => ({
        userId,
        name,
        isDefault: idx === 0,
      }));
      try {
        couriers = await Courier.insertMany(seedDocs);
      } catch (insertErr) {
        // In case of race conditions, query again
        couriers = await Courier.find({ userId }).sort({ createdAt: 1 });
      }
    }

    res.status(200).json(couriers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Add New Courier Partner
export const addCourier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, isDefault } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Courier Partner Name is required" });
    }

    const trimmedName = name.trim();

    // Check duplicate name for user
    const existing = await Courier.findOne({
      userId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        message: `Courier Partner "${trimmedName}" already exists!`,
      });
    }

    const totalCouriers = await Courier.countDocuments({ userId });
    const shouldBeDefault = totalCouriers === 0 || Boolean(isDefault);

    if (shouldBeDefault) {
      await Courier.updateMany({ userId }, { isDefault: false });
    }

    const newCourier = await Courier.create({
      userId,
      name: trimmedName,
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      message: "Courier partner added successfully",
      courier: newCourier,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update Courier Partner
export const updateCourier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, isDefault } = req.body;

    const existingCourier = await Courier.findOne({ _id: id, userId });
    if (!existingCourier) {
      return res.status(404).json({ message: "Courier partner not found" });
    }

    const trimmedName = name ? name.trim() : existingCourier.name;

    // Check duplicate
    const duplicate = await Courier.findOne({
      userId,
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
    });

    if (duplicate) {
      return res.status(400).json({
        message: `Another courier partner with name "${trimmedName}" already exists!`,
      });
    }

    // Update linked orders if name changed
    if (existingCourier.name !== trimmedName) {
      await Order.updateMany(
        { userId, courierPartner: existingCourier.name },
        { courierPartner: trimmedName }
      );
    }

    if (isDefault) {
      await Courier.updateMany({ userId, _id: { $ne: id } }, { isDefault: false });
    }

    const updatedCourier = await Courier.findOneAndUpdate(
      { _id: id, userId },
      {
        name: trimmedName,
        isDefault: isDefault !== undefined ? isDefault : existingCourier.isDefault,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Courier partner updated successfully",
      courier: updatedCourier,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete Courier Partner
export const deleteCourier = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingCourier = await Courier.findOne({ _id: id, userId });
    if (!existingCourier) {
      return res.status(404).json({ message: "Courier partner not found" });
    }

    const totalCouriers = await Courier.countDocuments({ userId });
    if (totalCouriers <= 1) {
      return res.status(400).json({
        message: "You must have at least one active courier partner in your account.",
      });
    }

    await Courier.findOneAndDelete({ _id: id, userId });

    if (existingCourier.isDefault) {
      const nextCourier = await Courier.findOne({ userId }).sort({ createdAt: 1 });
      if (nextCourier) {
        nextCourier.isDefault = true;
        await nextCourier.save();
      }
    }

    res.status(200).json({
      message: "Courier partner deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
