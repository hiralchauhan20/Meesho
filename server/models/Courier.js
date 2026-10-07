import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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

// Compound index: A user cannot have duplicate courier names
courierSchema.index({ userId: 1, name: 1 }, { unique: true });

const Courier = mongoose.model("Courier", courierSchema);

export default Courier;
