import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Expense from "../models/Expense.js";

export const getDashboard = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const orders = await Order.find();
    const expenses = await Expense.find();

    // 1. Calculate sales metrics
    let totalSales = 0;
    let totalCOGS = 0;
    let totalShipping = 0;
    let totalGST = 0;

    orders.forEach((order) => {
      const qty = order.quantity || 1;
      const gstAmount = (order.sellingPrice * (order.gst || 0)) / 100;
      
      totalSales += order.sellingPrice * qty;
      totalCOGS += order.purchasePrice * qty;
      totalShipping += (order.shippingCost || 0) * qty;
      totalGST += gstAmount * qty;
    });

    // 2. Calculate extra operational expenses
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 3. True Net Profit calculation
    const netProfit = totalSales - totalCOGS - totalShipping - totalGST - totalExpense;

    res.status(200).json({
      totalProducts,
      totalOrders,
      totalSales,
      totalExpense: totalExpense + totalShipping + totalGST, // Combine operational expenses, shipping, & GST for dashboard display
      netProfit,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
