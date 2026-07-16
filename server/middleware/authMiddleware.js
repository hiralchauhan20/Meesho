import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("TOKEN:", token);
    console.log("SECRET:", process.env.JWT_SECRET);
    if (!token) {
      return res.status(401).json({
        message: "No Token, Access Denied",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid Token",
    });
  }
};

export default authMiddleware;
