import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Order.js";

dotenv.config();

const run = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL not defined in .env");
    }
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB successfully");

    const total = await Order.countDocuments({});
    console.log("Total orders in database:", total);

    const paymentPending = await Order.countDocuments({ paymentStatus: "Pending" });
    console.log("Payment status 'Pending':", paymentPending);

    const paymentComplete = await Order.countDocuments({ paymentStatus: "Complete" });
    console.log("Payment status 'Complete':", paymentComplete);

    // Let's print details of the 20 newest orders in the database
    const newest = await Order.find({}).sort({ date: -1, createdAt: -1 }).limit(20);
    newest.forEach((o, index) => {
      console.log(`[Newest #${index}] Date: ${o.date || o.createdAt}, OrderNo: ${o.orderNo}, PayStatus: ${o.paymentStatus}, DispatchStatus: ${o.dispatchStatus}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error in check_db:", err.message);
    process.exit(1);
  }
};

run();
