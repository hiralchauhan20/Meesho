import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB Connected Successfully");

    // Safe auto-cleanup of legacy shop index if present
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      if (collections.some((c) => c.name === "shops")) {
        const indexes = await mongoose.connection.db.collection("shops").indexes();
        if (indexes.some((i) => i.name === "userId_1_shopName_1")) {
          await mongoose.connection.db.collection("shops").dropIndex("userId_1_shopName_1");
          console.log("Cleaned up legacy userId_1_shopName_1 index.");
        }
      }
    } catch (idxErr) {
      // Non-critical, ignore
    }
  } catch (error) {
    console.log("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;

