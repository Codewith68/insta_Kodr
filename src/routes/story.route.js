import { Router } from "express";
import { uploadStory, getMyStories } from "../controllers/story.controller.js";
import upload from "../config/multer.config.js";
import { auth } from "../middleware/auth.middleware.js";

const storyRouter = Router();

storyRouter.post("/upload", auth, upload.array("media", 10), uploadStory);
storyRouter.get("/mystories", auth, getMyStories);

export default storyRouter;
