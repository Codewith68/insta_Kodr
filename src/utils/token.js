import jwt from "jsonwebtoken";
import config from "../config/config.js";
import blacklistedTokenModel from "../models/blacklisted-token.model.js";

function getTokenExpiryDate(token) {
  const decoded = jwt.decode(token);

  if (!decoded?.exp) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  return new Date(decoded.exp * 1000);
}

export function generateAccessToken(userId) {
  return jwt.sign({ id: userId, type: "access" }, config.ACCESS_TOKEN_SECRET, {
    expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId) {
  return jwt.sign({ id: userId, type: "refresh" }, config.REFRESH_TOKEN_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }

  return decoded;
}

export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, config.REFRESH_TOKEN_SECRET);

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  return decoded;
}

export async function isTokenBlacklisted(token) {
  const blacklistedToken = await blacklistedTokenModel.findOne({ token });
  return Boolean(blacklistedToken);
}

export async function blacklistToken(token) {
  if (!token) {
    return;
  }

  const alreadyBlacklisted = await isTokenBlacklisted(token);

  if (alreadyBlacklisted) {
    return;
  }

  await blacklistedTokenModel.create({
    token,
    expiresAt: getTokenExpiryDate(token),
  });
}

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: config.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export function getClearRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: config.NODE_ENV === "production" ? "none" : "lax",
  };
}
