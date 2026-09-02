import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Order.js";
import User from "./models/User.js";
import Shop from "./models/Shop.js";

dotenv.config();

const migrate = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL not defined in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB successfully.");

    // 1. Ensure all existing users have "HKC Collection" shop
    const users = await User.find({});
    console.log(`Found ${users.length} users in database.`);

    for (const user of users) {
      const existingShop = await Shop.findOne({ userId: user._id, shopName: "HKC Collection" });
      if (!existingShop) {
        await Shop.create({
          userId: user._id,
          shopName: "HKC Collection",
          platform: "Meesho",
          status: "Active",
          description: "Primary default shop account",
          isDefault: true,
        });
        console.log(`Created default shop 'HKC Collection' for user ${user.email} (${user._id})`);
      } else {
        console.log(`Shop 'HKC Collection' already exists for user ${user.email}`);
      }
    }

    // 2. Update all existing orders without shopName or with empty shopName
    const ordersToUpdate = await Order.updateMany(
      { $or: [{ shopName: { $exists: false } }, { shopName: null }, { shopName: "" }] },
      { $set: { shopName: "HKC Collection", shopPlatform: "Meesho" } }
    );

    console.log(`Updated ${ordersToUpdate.modifiedCount} existing orders to 'HKC Collection' (Meesho).`);

    const totalOrders = await Order.countDocuments({});
    console.log(`Total orders now in database: ${totalOrders}`);

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
