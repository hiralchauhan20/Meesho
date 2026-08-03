import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Expense from "../models/Expense.js";
import Investment from "../models/Investment.js";

export const getDashboard = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const orders = await Order.find();
    const expenses = await Expense.find();
    const investments = await Investment.find();

    // 1. Calculate sales metrics
    let totalSales = 0;
    let totalShipping = 0;
    let totalGST = 0;

    orders.forEach((order) => {
      const qty = order.quantity || 1;
      const gstAmount = (order.sellingPrice * (order.gst || 0)) / 100;
      
      totalSales += order.sellingPrice * qty;
      totalShipping += (order.shippingCost || 0) * qty;
      totalGST += gstAmount * qty;
    });

    // 2. Calculate extra operational expenses and investments
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalInvestment = investments.reduce((sum, inv) => sum + (inv.price || 0), 0);

    // 3. True Net Profit calculation (Sales minus investments, shipping, GST, and extra expenses)
    const netProfit = totalSales - totalInvestment - totalShipping - totalGST - totalExpense;

    res.status(200).json({
      totalProducts,
      totalOrders,
      totalSales,
      totalExpense: totalExpense + totalShipping + totalGST, // Combine operational expenses, shipping, & GST for dashboard display
      totalInvestment,
      netProfit,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
