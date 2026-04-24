import { Router } from "express";
import { createPost, getPosts, getUserPosts } from "../controllers/post.controller.js";
import upload from "../config/multer.config.js";
import { auth } from "../middleware/auth.middleware.js";

const postRouter = Router();

postRouter.post("/create", auth, upload.array("media"), createPost);
postRouter.get("/posts", getPosts);
postRouter.get("/user/:userId", getUserPosts);

export default postRouter;
