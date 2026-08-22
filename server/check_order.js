import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Order.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    const order = await Order.findOne({ awbId: "SF3699863395FPL" });
    console.log("Order found:", JSON.stringify(order, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
