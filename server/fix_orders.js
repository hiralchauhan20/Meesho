import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Order.js";

dotenv.config();

const run = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL not defined in environment");
    }
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB Connected Successfully for migration");

    // Cutoff: 48 hours ago
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Update all pending orders older than 48 hours to "Dispatched"
    const result = await Order.updateMany(
      {
        dispatchStatus: { $ne: "Dispatched" },
        paymentStatus: "Pending",
        date: { $lt: cutoff }
      },
      {
        $set: { dispatchStatus: "Dispatched" }
      }
    );

    console.log(`Migration complete: Marked ${result.modifiedCount} old pending orders as 'Dispatched'.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(1);
  }
};

run();
