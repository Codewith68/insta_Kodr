import bcrypt from "bcrypt";
import config from "../config/config.js";
import userModel from "../models/user.model.js";
import { uploadFile } from "../services/auth.services.js";
import {
  blacklistToken,
  generateAccessToken,
  generateRefreshToken,
  getClearRefreshCookieOptions,
  getRefreshCookieOptions,
  isTokenBlacklisted,
  verifyRefreshToken,
} from "../utils/token.js";

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
}

function sanitizeUser(user) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    fullname: user.fullname,
    googleId: user.googleId,
    profilePic: user.profilePic,
    bio: user.bio || "",
    followers: user.followers || [],
    following: user.following || [],
    followRequests: user.followRequests || [],
    sentRequests: user.sentRequests || []
  };
}

function buildGoogleRedirectUrl(accessToken, user) {
  const params = new URLSearchParams({
    accessToken,
    user: JSON.stringify(sanitizeUser(user)),
  });

  return `${config.FRONTEND_URL}/auth/callback?${params.toString()}`;
}

function buildGoogleFailureRedirect(message) {
  const params = new URLSearchParams({
    error: message,
  });

  return `${config.FRONTEND_URL}/login?${params.toString()}`;
}

export async function register(req, res) {
  try {
    const { username, email, password, fullname } = req.body;

    if (!username || !email || !password || !fullname) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const existingUser = await userModel.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePic;
    if (req.file) {
      const result = await uploadFile(req.file.buffer, req.file.originalname, "/profile-pics");
      profilePic = result.url;
    }

    const newUser = await userModel.create({
      username,
      email,
      password: hashedPassword,
      fullname,
      ...(profilePic && { profilePic }),
    });

    const accessToken = generateAccessToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);

    res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());

    return res.status(201).json({
      message: "User created successfully",
      accessToken,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
}

export async function login(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username && !email) {
      return res.status(400).json({ message: "Please provide either username or email" });
    }

    const user = await userModel.findOne({ $or: [{ username }, { email }] }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid username or email" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "You signed up with Google. Please use 'Log in with Google'." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
}

export async function refreshAccessToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    const isBlacklisted = await isTokenBlacklisted(refreshToken);

    if (isBlacklisted) {
      res.clearCookie("refreshToken", getClearRefreshCookieOptions());
      return res.status(401).json({ message: "Refresh token is no longer valid" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await blacklistToken(refreshToken);

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.cookie("refreshToken", newRefreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
}

export async function logout(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;
    const accessToken = getBearerToken(req);

    if (refreshToken) {
      await blacklistToken(refreshToken);
    }

    if (accessToken) {
      await blacklistToken(accessToken);
    }

    res.clearCookie("refreshToken", getClearRefreshCookieOptions());

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
}



export async function googleCallback(req,res){
  try {
    if (!req.user) {
      return res.redirect(buildGoogleFailureRedirect("Google authentication failed"));
    }

    const { id, displayName, emails, photos } = req.user;
    const email = emails?.[0]?.value;

    if (!email) {
      return res.redirect(buildGoogleFailureRedirect("Google account email not found"));
    }

    const existingUser = await userModel.findOne({
      $or: [{ email }, { googleId: id }],
    });

    if (existingUser) {
      if (!existingUser.googleId) {
        await userModel.findByIdAndUpdate(existingUser._id, {
          googleId: id,
          ...(existingUser.profilePic || !photos?.[0]?.value
            ? {}
            : { profilePic: photos[0].value }),
        });

        existingUser.googleId = id;
        if (!existingUser.profilePic && photos?.[0]?.value) {
          existingUser.profilePic = photos[0].value;
        }
      }

      const accessToken = generateAccessToken(existingUser._id);
      const refreshToken = generateRefreshToken(existingUser._id);

      res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());

      return res.redirect(buildGoogleRedirectUrl(accessToken, existingUser));
    }

    const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
    let username = baseUsername;
    let suffix = 1;

    while (await userModel.findOne({ username })) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    const newUser = await userModel.create({
      username,
      email,
      googleId: id,
      fullname: displayName || username,
      profilePic: photos?.[0]?.value || "",
    });

    const accessToken = generateAccessToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);

    res.cookie("refreshToken", refreshToken, getRefreshCookieOptions());

    return res.redirect(buildGoogleRedirectUrl(accessToken, newUser));
  } catch (error) {
      console.log(error);
      return res.redirect(buildGoogleFailureRedirect(error.message || "Google login failed"));
  }
}
