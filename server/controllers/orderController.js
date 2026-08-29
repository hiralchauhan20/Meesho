import Order from "../models/Order.js";

// Add Order
export const addOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderNo, awbId } = req.body;

    // Check duplicate orderNo for this user (if orderNo provided)
    if (orderNo && orderNo.trim()) {
      const existingOrderNo = await Order.findOne({ userId, orderNo: orderNo.trim() });
      if (existingOrderNo) {
        return res.status(400).json({
          message: `Order ID "${orderNo.trim()}" already exists! Duplicate Order IDs are not allowed.`
        });
      }
    }

    // Check duplicate awbId for this user (if awbId provided)
    if (awbId && awbId.trim()) {
      const existingAwbId = await Order.findOne({ userId, awbId: awbId.trim() });
      if (existingAwbId) {
        return res.status(400).json({
          message: `Tracking ID (AWB) "${awbId.trim()}" already exists! Duplicate Tracking IDs are not allowed.`
        });
      }
    }

    const orderData = { ...req.body, userId };
    if (orderData.paymentStatus && orderData.paymentStatus !== "Pending") {
      orderData.statusChangedAt = new Date();
      orderData.dispatchStatus = "Dispatched";
    }
    const order = await Order.create(orderData);

    res.status(201).json({
      message: "Order Added Successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get All Orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).populate("productId");

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update Order Status
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    // Find the existing order first
    const existingOrder = await Order.findOne({ _id: orderId, userId });
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order is locked (non-Pending status set more than 24 hours ago)
    const isCurrentlyLockedStatus = existingOrder.paymentStatus && existingOrder.paymentStatus !== "Pending";
    if (isCurrentlyLockedStatus) {
      const lockBaseTime = existingOrder.statusChangedAt || existingOrder.updatedAt || existingOrder.createdAt;
      if (lockBaseTime && (new Date() - new Date(lockBaseTime)) > 24 * 60 * 60 * 1000) {
        return res.status(400).json({
          message: "This order is locked and cannot be modified after 24 hours of setting its status."
        });
      }
    }

    // Prepare update data
    const updateData = { ...req.body };

    // Check duplicate orderNo for this user (if orderNo provided and changed)
    if (updateData.orderNo && updateData.orderNo.trim()) {
      const existingOrderNo = await Order.findOne({ 
        userId, 
        orderNo: updateData.orderNo.trim(), 
        _id: { $ne: orderId } 
      });
      if (existingOrderNo) {
        return res.status(400).json({
          message: `Order ID "${updateData.orderNo.trim()}" already exists on another order!`
        });
      }
    }

    // Check duplicate awbId for this user (if awbId provided and changed)
    if (updateData.awbId && updateData.awbId.trim()) {
      const existingAwbId = await Order.findOne({ 
        userId, 
        awbId: updateData.awbId.trim(), 
        _id: { $ne: orderId } 
      });
      if (existingAwbId) {
        return res.status(400).json({
          message: `Tracking ID (AWB) "${updateData.awbId.trim()}" already exists on another order!`
        });
      }
    }

    // If changing status, update statusChangedAt accordingly
    if (updateData.paymentStatus && existingOrder.paymentStatus !== updateData.paymentStatus) {
      if (updateData.paymentStatus === "Pending") {
        updateData.statusChangedAt = null;
      } else {
        updateData.statusChangedAt = new Date();
        updateData.dispatchStatus = "Dispatched";
      }
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, userId },
      updateData,
      { new: true }
    ).populate("productId");

    res.status(200).json({
      message: "Order Status Updated",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete Order
export const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const existingOrder = await Order.findOne({ _id: orderId, userId });
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order is locked (non-Pending status set more than 24 hours ago)
    const isCurrentlyLockedStatus = existingOrder.paymentStatus && existingOrder.paymentStatus !== "Pending";
    if (isCurrentlyLockedStatus) {
      const lockBaseTime = existingOrder.statusChangedAt || existingOrder.updatedAt || existingOrder.createdAt;
      if (lockBaseTime && (new Date() - new Date(lockBaseTime)) > 24 * 60 * 60 * 1000) {
        return res.status(400).json({
          message: "This order is locked and cannot be deleted after 24 hours of setting its status."
        });
      }
    }

    await Order.findOneAndDelete({ _id: orderId, userId });

    res.status(200).json({
      message: "Order Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Bulk Add Orders
export const bulkAddOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: "No orders provided for bulk import." });
    }

    const results = {
      successCount: 0,
      duplicatesCount: 0,
      errorsCount: 0,
      savedOrders: [],
      errors: []
    };

    for (const orderData of orders) {
      try {
        const { orderNo, awbId } = orderData;

        // Check duplicate orderNo for this user
        if (orderNo && orderNo.trim()) {
          const existingOrderNo = await Order.findOne({ userId, orderNo: orderNo.trim() });
          if (existingOrderNo) {
            results.duplicatesCount++;
            results.errors.push(`Order ID "${orderNo.trim()}" already exists.`);
            continue;
          }
        }

        // Check duplicate awbId for this user
        if (awbId && awbId.trim()) {
          const existingAwbId = await Order.findOne({ userId, awbId: awbId.trim() });
          if (existingAwbId) {
            results.duplicatesCount++;
            results.errors.push(`Tracking ID (AWB) "${awbId.trim()}" already exists.`);
            continue;
          }
        }

        const finalOrderData = { ...orderData, userId };
        if (finalOrderData.paymentStatus && finalOrderData.paymentStatus !== "Pending") {
          finalOrderData.statusChangedAt = new Date();
          finalOrderData.dispatchStatus = "Dispatched";
        }

        const order = await Order.create(finalOrderData);
        results.savedOrders.push(order);
        results.successCount++;
      } catch (err) {
        results.errorsCount++;
        results.errors.push(err.message);
      }
    }

    res.status(201).json({
      message: `Bulk import completed: ${results.successCount} saved, ${results.duplicatesCount} duplicates skipped.`,
      results
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Bulk Delete Orders
export const bulkDeleteOrders = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No order IDs provided" });
    }

    const selectedOrders = await Order.find({ _id: { $in: ids }, userId });

    const deletableIds = [];
    const lockedIds = [];

    selectedOrders.forEach((o) => {
      const isCurrentlyLockedStatus = o.paymentStatus && o.paymentStatus !== "Pending";
      let isLocked = false;
      if (isCurrentlyLockedStatus) {
        const lockBaseTime = o.statusChangedAt || o.updatedAt || o.createdAt;
        if (lockBaseTime && (new Date() - new Date(lockBaseTime)) > 24 * 60 * 60 * 1000) {
          isLocked = true;
        }
      }
      if (isLocked) {
        lockedIds.push(o._id);
      } else {
        deletableIds.push(o._id);
      }
    });

    if (deletableIds.length === 0) {
      return res.status(400).json({
        message: "All selected orders are locked and cannot be deleted after 24 hours of status change."
      });
    }

    await Order.deleteMany({ _id: { $in: deletableIds }, userId });

    res.status(200).json({
      message: `Successfully deleted ${deletableIds.length} orders.${lockedIds.length > 0 ? ` Skipped ${lockedIds.length} locked orders.` : ""}`,
      deletedCount: deletableIds.length,
      skippedCount: lockedIds.length
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

