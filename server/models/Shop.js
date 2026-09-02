import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["Meesho", "Flipkart", "Amazon", "Glowroad", "Shopsy", "Other"],
      default: "Meesho",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    description: {
      type: String,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a user cannot have two shops with the exact same name
shopSchema.index({ userId: 1, shopName: 1 }, { unique: true });

const Shop = mongoose.model("Shop", shopSchema);

export default Shop;
