import userModel from "../models/user.model.js";
import { isTokenBlacklisted, verifyAccessToken } from "../utils/token.js";

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
}

export const auth = async (req, res, next) => {
  try {
    const accessToken = getBearerToken(req);

    if (!accessToken || accessToken === "null" || accessToken === "undefined") {
      return res.status(401).json({ message: "Access token is required" });
    }

    const isBlacklisted = await isTokenBlacklisted(accessToken);

    if (isBlacklisted) {
      return res.status(401).json({ message: "Token has been blacklisted" });
    }

    const decoded = verifyAccessToken(accessToken);
    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError") {
      console.log(error);
    }
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};

export async function getMe(req, res) {
  try {
    return res.status(200).json({
      user: req.user,
      message: "User found",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
}
