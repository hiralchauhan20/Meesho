import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      default: "Meesho Buyer",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderNo: {
      type: String,
      default: "", // Meesho Order ID
    },

    awbId: {
      type: String,
      default: "", // Airway Bill / Tracking ID
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Complete", "RTO Returned", "Cancel", "Return"],
      default: "Pending",
    },

    customerState: {
      type: String,
      default: "Gujarat", // India State
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false, // Made optional for direct text entries
    },

    productName: {
      type: String,
      required: true, // The product name entered in the ledger row
    },

    purchasePrice: {
      type: Number,
      required: true, // buying price
    },

    sellingPrice: {
      type: Number,
      required: true, // selling price
    },

    quantity: {
      type: Number,
      default: 1,
    },

    shippingCost: {
      type: Number,
      default: 0,
    },

    gst: {
      type: Number,
      default: 0, // GST percentage (e.g. 5, 12, 18, 28)
    },

    courierPartner: {
      type: String,
      default: "Valmo", // Courier options: Valmo, Xpressbees, Shadowfax, Delhivery, Ecom
    },

    date: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      default: "Completed",
    },

    deliveryStatus: {
      type: String,
      default: "Delivered",
    },

    trackingId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
