import Investment from "../models/Investment.js";

// Add Investment
export const addInvestment = async (req, res) => {
  try {
    const investment = await Investment.create({ ...req.body, userId: req.user.id });

    res.status(201).json({
      message: "Investment Added Successfully",
      investment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get All Investments
export const getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });

    res.status(200).json(investments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update Investment
export const updateInvestment = async (req, res) => {
  try {
    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    if (!investment) {
      return res.status(404).json({
        message: "Investment not found",
      });
    }

    res.status(200).json({
      message: "Investment Updated Successfully",
      investment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete Investment
export const deleteInvestment = async (req, res) => {
  try {
    const investment = await Investment.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!investment) {
      return res.status(404).json({
        message: "Investment not found",
      });
    }

    res.status(200).json({
      message: "Investment Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
