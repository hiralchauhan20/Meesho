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
    if (orderData.paymentStatus === "RTO Returned" || orderData.paymentStatus === "Cancel") {
      orderData.statusChangedAt = new Date();
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

    // Check if the order is locked (RTO / Cancelled more than 24 hours ago)
    const isCurrentlyRtoOrCancel = existingOrder.paymentStatus === "RTO Returned" || existingOrder.paymentStatus === "Cancel";
    if (isCurrentlyRtoOrCancel) {
      const lockBaseTime = existingOrder.statusChangedAt || existingOrder.updatedAt || existingOrder.createdAt;
      if (lockBaseTime && (new Date() - new Date(lockBaseTime)) > 24 * 60 * 60 * 1000) {
        return res.status(400).json({
          message: "This order is locked and cannot be modified after 24 hours of setting RTO Returned or Cancel status."
        });
      }
    }

    // Prepare update data
    const updateData = { ...req.body };

    // If changing status to RTO Returned or Cancel, set statusChangedAt
    const willBeRtoOrCancel = updateData.paymentStatus === "RTO Returned" || updateData.paymentStatus === "Cancel";
    if (willBeRtoOrCancel && existingOrder.paymentStatus !== updateData.paymentStatus) {
      updateData.statusChangedAt = new Date();
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, userId },
      updateData,
      { new: true }
    );

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

    // Check if the order is locked (RTO / Cancelled more than 24 hours ago)
    const isCurrentlyRtoOrCancel = existingOrder.paymentStatus === "RTO Returned" || existingOrder.paymentStatus === "Cancel";
    if (isCurrentlyRtoOrCancel) {
      const lockBaseTime = existingOrder.statusChangedAt || existingOrder.updatedAt || existingOrder.createdAt;
      if (lockBaseTime && (new Date() - new Date(lockBaseTime)) > 24 * 60 * 60 * 1000) {
        return res.status(400).json({
          message: "This order is locked and cannot be deleted after 24 hours of setting RTO Returned or Cancel status."
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
