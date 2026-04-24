import { Router } from "express";
import passport from "passport";
import {
  loginValidator,
  registerValidator,
} from "../validators/auth.validator.js";
import {
  googleCallback,
  login,
  logout,
  refreshAccessToken,
  register,
} from "../controllers/auth.controller.js";
import { auth, getMe } from "../middleware/auth.middleware.js";
import upload from "../config/multer.config.js";

const authRouter = Router();

authRouter.post("/register", upload.single("profilePic"), registerValidator, register);
authRouter.post("/login", loginValidator, login);
authRouter.post("/refresh", refreshAccessToken);
authRouter.post("/logout", logout);
authRouter.get("/getme", auth, getMe);




// GET /api/auth/google
authRouter.get("/google",
  passport.authenticate("google", {
    scope: [ "profile", "email" ],
  })
)



authRouter.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=Google%20authentication%20failed`,
    session: false,
  }),
  googleCallback
)


export default authRouter;
