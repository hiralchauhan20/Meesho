import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const fixIndexes = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL not defined in .env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB successfully.");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const hasShops = collections.some((c) => c.name === "shops");

    if (hasShops) {
      const existingIndexes = await db.collection("shops").indexes();
      console.log("Current indexes on shops collection:", existingIndexes.map((i) => i.name));

      // Drop old userId_1_shopName_1 index if it exists
      const oldIndex = existingIndexes.find((i) => i.name === "userId_1_shopName_1");
      if (oldIndex) {
        console.log("Found legacy index 'userId_1_shopName_1'. Dropping it now...");
        await db.collection("shops").dropIndex("userId_1_shopName_1");
        console.log("Legacy index 'userId_1_shopName_1' dropped successfully!");
      } else {
        console.log("Legacy index 'userId_1_shopName_1' not found.");
      }

      // Ensure the new compound index { userId: 1, platform: 1, shopName: 1 } exists
      await db.collection("shops").createIndex(
        { userId: 1, platform: 1, shopName: 1 },
        { unique: true, name: "userId_1_platform_1_shopName_1" }
      );
      console.log("Ensured compound unique index { userId: 1, platform: 1, shopName: 1 } exists.");

      const updatedIndexes = await db.collection("shops").indexes();
      console.log("Updated indexes on shops collection:", updatedIndexes.map((i) => i.name));
    }

    console.log("Index cleanup finished successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Index cleanup failed:", error);
    process.exit(1);
  }
};

fixIndexes();
