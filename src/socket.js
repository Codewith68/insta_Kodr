import { Server } from "socket.io";
import { verifyAccessToken } from "./utils/token.js";
import conversationModel from "./models/conversation.model.js";
import messageModel from "./models/message.model.js";

let io;

/**
 * Returns a consistent room name for two users by sorting their IDs.
 */
function getConversationRoom(userId1, userId2) {
  const sorted = [userId1.toString(), userId2.toString()].sort();
  return `chat:${sorted[0]}:${sorted[1]}`;
}

/**
 * Initialize Socket.IO server with JWT authentication middleware.
 */
export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
      credentials: true,
    },
  });

  // ── Auth middleware — verify JWT on every connection ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: token required"));
    }

    try {
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error("Authentication error: invalid token"));
    }
  });

  // ── Connection handler ──
  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`⚡ Socket connected: ${userId}`);

    // Join personal room for DM notifications
    socket.join(`user:${userId}`);

    // ── join_conversation ──
    socket.on("join_conversation", async ({ conversationId }) => {
      try {
        const conversation = await conversationModel.findById(conversationId);
        if (!conversation) return;

        // Verify the user is a participant
        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) return;

        // Build room name from the two participants
        const [p1, p2] = conversation.participants;
        const room = getConversationRoom(p1, p2);
        socket.join(room);
      } catch (error) {
        console.error("join_conversation error:", error);
      }
    });

    // ── send_message ──
    socket.on("send_message", async ({ conversationId, text, mediaUrl, mediaType }) => {
      try {
        const conversation = await conversationModel.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) return;

        // Create message in DB
        const message = await messageModel.create({
          conversation: conversationId,
          sender: userId,
          text: text || "",
          mediaUrl,
          mediaType,
          readBy: [userId],
        });

        // Populate sender details
        await message.populate("sender", "username fullname profilePic");

        // Update conversation's last message
        const lastMessage = {
          text: text || "",
          sender: userId,
          timestamp: message.createdAt,
          mediaType: mediaType || undefined,
        };

        await conversationModel.findByIdAndUpdate(conversationId, {
          lastMessage,
          $pull: { hiddenBy: { $in: conversation.participants } },
        });

        // Emit to conversation room
        const [p1, p2] = conversation.participants;
        const room = getConversationRoom(p1, p2);
        io.to(room).emit("new_message", message);

        // Emit new_conversation event to recipient's personal room
        const recipientId = conversation.participants.find(
          (p) => p.toString() !== userId
        );
        if (recipientId) {
          const updatedConversation = await conversationModel
            .findById(conversationId)
            .populate("participants", "username fullname profilePic");

          io.to(`user:${recipientId.toString()}`).emit(
            "new_conversation",
            updatedConversation
          );
        }
      } catch (error) {
        console.error("send_message error:", error);
      }
    });

    // ── typing ──
    socket.on("typing", ({ conversationId, participants }) => {
      if (!participants || participants.length < 2) return;
      const room = getConversationRoom(participants[0], participants[1]);
      socket.to(room).emit("typing", { userId, conversationId });
    });

    // ── stop_typing ──
    socket.on("stop_typing", ({ conversationId, participants }) => {
      if (!participants || participants.length < 2) return;
      const room = getConversationRoom(participants[0], participants[1]);
      socket.to(room).emit("stop_typing", { userId, conversationId });
    });

    // ── mark_read ──
    socket.on("mark_read", async ({ conversationId }) => {
      try {
        const conversation = await conversationModel.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) return;

        // Add userId to readBy for all unread messages in this conversation
        await messageModel.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: userId },
            readBy: { $nin: [userId] },
          },
          { $addToSet: { readBy: userId } }
        );

        const [p1, p2] = conversation.participants;
        const room = getConversationRoom(p1, p2);
        io.to(room).emit("message_read", { conversationId, readBy: userId });
      } catch (error) {
        console.error("mark_read error:", error);
      }
    });

    // ── disconnect ──
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${userId}`);
    });
  });

  return io;
}

/**
 * Get the Socket.IO instance for use in REST controllers.
 */
export function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}