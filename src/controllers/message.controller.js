import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import userModel from "../models/user.model.js";
import { uploadFile } from "../services/auth.services.js";
import { getIO } from "../socket.js";

/**
 * GET /api/messages/conversations
 * Get all conversations for the current user.
 */
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const conversations = await conversationModel
      .find({
        participants: currentUserId,
        hiddenBy: { $ne: currentUserId },
      })
      .populate("participants", "username fullname profilePic")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      message: "Conversations fetched successfully",
      data: conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/messages/conversations/:conversationId
 * Get a single conversation's details.
 */
export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const conversation = await conversationModel
      .findById(conversationId)
      .populate("participants", "username fullname profilePic");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === currentUserId
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.status(200).json({
      message: "Conversation fetched successfully",
      data: conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/messages/:conversationId
 * Get paginated messages for a conversation.
 */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Verify user is a participant
    const conversation = await conversationModel.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const messages = await messageModel
      .find({ conversation: conversationId })
      .populate("sender", "username fullname profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await messageModel.countDocuments({
      conversation: conversationId,
    });

    res.status(200).json({
      message: "Messages fetched successfully",
      data: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * POST /api/messages/:userId
 * Send a message to a user (creates conversation if it doesn't exist).
 * Only followers/following (mutual connection) can send messages.
 */
export const sendMessage = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;
    const { text } = req.body;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    // ── Check mutual follow (both must follow each other) ──
    const currentUser = await userModel.findById(currentUserId);
    const targetUser = await userModel.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentFollowsTarget = currentUser.following.some(
      (id) => id.toString() === targetUserId
    );
    const targetFollowsCurrent = targetUser.following.some(
      (id) => id.toString() === currentUserId
    );

    if (!currentFollowsTarget || !targetFollowsCurrent) {
      return res.status(403).json({
        message: "You can only message users who follow you back",
      });
    }

    // Handle media upload
    let mediaUrl = null;
    let mediaType = null;

    if (req.file) {
      const result = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        "/messages"
      );
      mediaUrl = result.url;
      mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";
    }

    if (!text && !mediaUrl) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    // Find existing conversation or create new one
    let conversation = await conversationModel.findOne({
      participants: { $all: [currentUserId, targetUserId], $size: 2 },
    });

    let isNewConversation = false;

    if (!conversation) {
      conversation = await conversationModel.create({
        participants: [currentUserId, targetUserId],
      });
      isNewConversation = true;
    }

    // Unhide conversation for both participants
    await conversationModel.findByIdAndUpdate(conversation._id, {
      $pull: { hiddenBy: { $in: [currentUserId, targetUserId] } },
    });

    // Create the message
    const message = await messageModel.create({
      conversation: conversation._id,
      sender: currentUserId,
      text: text || "",
      mediaUrl,
      mediaType,
      readBy: [currentUserId],
    });

    await message.populate("sender", "username fullname profilePic");

    // Update conversation's lastMessage
    const lastMessage = {
      text: text || "",
      sender: currentUserId,
      timestamp: message.createdAt,
      mediaType: mediaType || undefined,
    };

    await conversationModel.findByIdAndUpdate(conversation._id, {
      lastMessage,
    });

    // Emit via Socket.IO
    try {
      const socketIO = getIO();
      const sorted = [currentUserId, targetUserId].sort();
      const room = `chat:${sorted[0]}:${sorted[1]}`;

      socketIO.to(room).emit("new_message", message);

      if (isNewConversation) {
        const populatedConversation = await conversationModel
          .findById(conversation._id)
          .populate("participants", "username fullname profilePic");

        socketIO
          .to(`user:${targetUserId}`)
          .emit("new_conversation", populatedConversation);
      }
    } catch (socketError) {
      // Socket not initialized — still save the message via REST
      console.log("Socket emit skipped:", socketError.message);
    }

    res.status(201).json({
      message: "Message sent successfully",
      data: {
        message,
        conversation: conversation._id,
        isNewConversation,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * DELETE /api/messages/:conversationId
 * Soft-delete (hide) a conversation for the current user.
 */
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const conversation = await conversationModel.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId
    );

    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await conversationModel.findByIdAndUpdate(conversationId, {
      $addToSet: { hiddenBy: currentUserId },
    });

    res.status(200).json({ message: "Conversation deleted" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/messages/check-access/:userId
 * Check if the current user can message a target user (mutual follow check).
 */
export const checkMessageAccess = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(200).json({ canMessage: false, reason: "self" });
    }

    const currentUser = await userModel.findById(currentUserId);
    const targetUser = await userModel.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentFollowsTarget = currentUser.following.some(
      (id) => id.toString() === targetUserId
    );
    const targetFollowsCurrent = targetUser.following.some(
      (id) => id.toString() === currentUserId
    );

    const canMessage = currentFollowsTarget && targetFollowsCurrent;

    res.status(200).json({
      canMessage,
      reason: canMessage ? "mutual" : "not_mutual",
    });
  } catch (error) {
    console.error("Check message access error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
