import dotenv from "dotenv";

dotenv.config();

if (!process.env.PORT) console.log("PORT not found in .env file");
if (!process.env.MONGO_URI) console.log("MONGO_URI not found in .env file");
if (!process.env.JWT_SECRET && !process.env.ACCESS_TOKEN_SECRET) {
  console.log("ACCESS_TOKEN_SECRET not found in .env file");
}
if (!process.env.JWT_SECRET && !process.env.REFRESH_TOKEN_SECRET) {
  console.log("REFRESH_TOKEN_SECRET not found in .env file");
}
if(!process.env.GOOGLE_CLIENT_ID) console.log("GOOGLE_CLIENT_ID not found in.env file");
if(!process.env.GOOGLE_CLIENT_SECRET) console.log("GOOGLE_CLIENT_SECRET not found in.env file");
const config = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/mydatabase",
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || "jwtsecretkey",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || "jwtsecretkey",
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
  GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET:process.env.GOOGLE_CLIENT_SECRET
};

export default config;
