import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    purchasePrice: {
      type: Number,
      required: true,
    },

    sellingPrice: {
      type: Number,
      required: true,
    },

    gst: {
      type: Number,
      default: 0,
    },

    quantity: {
      type: Number,
      default: 0,
    },

    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model("Product", productSchema);

export default Product;
