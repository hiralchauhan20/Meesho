import Order from "../models/Order.js";

// Add Order
export const addOrder = async (req, res) => {
  try {
    const order = await Order.create({ ...req.body, userId: req.user.id });

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
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
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
    await Order.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    res.status(200).json({
      message: "Order Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
