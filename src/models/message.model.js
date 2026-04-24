import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Userr",
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Userr",
      },
    ],
  },
  { timestamps: true }
);

// Index for fetching messages in a conversation
messageSchema.index({ conversation: 1, createdAt: -1 });

const messageModel = mongoose.model("Message", messageSchema);

export default messageModel;
