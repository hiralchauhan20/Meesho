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
    console.log("Connected to MongoDB for clean migration");

    // 1. Get all orders sorted by date/createdAt descending (newest first)
    const allOrders = await Order.find({}).sort({ date: -1, createdAt: -1 });
    console.log(`Found ${allOrders.length} total orders.`);

    // 2. Identify the newest 10 pending-payment orders that should remain undispatched
    let pendingCount = 0;
    const undispatchedIds = new Set();

    for (const order of allOrders) {
      if (order.paymentStatus === "Pending") {
        if (pendingCount < 10) {
          undispatchedIds.add(order._id.toString());
          pendingCount++;
        }
      }
    }
    console.log(`Identified ${undispatchedIds.size} newest pending orders to keep as 'Pending' dispatch.`);

    // 3. Update database
    let dispatchedUpdateCount = 0;
    let pendingUpdateCount = 0;

    for (const order of allOrders) {
      const orderIdStr = order._id.toString();
      if (undispatchedIds.has(orderIdStr)) {
        // Mark as Pending dispatch
        await Order.updateOne({ _id: order._id }, { $set: { dispatchStatus: "Pending" } });
        pendingUpdateCount++;
      } else {
        // Mark as Dispatched
        await Order.updateOne({ _id: order._id }, { $set: { dispatchStatus: "Dispatched" } });
        dispatchedUpdateCount++;
      }
    }

    console.log(`Database updated successfully!`);
    console.log(`- Marked ${dispatchedUpdateCount} orders as 'Dispatched' (Payment status remains completely untouched).`);
    console.log(`- Marked ${pendingUpdateCount} newest pending orders as 'Pending' dispatch.`);

    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(1);
  }
};

run();
