import { Router } from "express";
import {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  deleteConversation,
  checkMessageAccess,
} from "../controllers/message.controller.js";
import { auth } from "../middleware/auth.middleware.js";
import upload from "../config/multer.config.js";

const messageRouter = Router();

// All routes require authentication
messageRouter.use(auth);

// Conversation routes
messageRouter.get("/conversations", getConversations);
messageRouter.get("/conversations/:conversationId", getConversation);

// Check if user can message another user
messageRouter.get("/check-access/:userId", checkMessageAccess);

// Message routes
messageRouter.get("/:conversationId", getMessages);
messageRouter.post("/:userId", upload.single("media"), sendMessage);
messageRouter.delete("/:conversationId", deleteConversation);

export default messageRouter;
