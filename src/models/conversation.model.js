import mongoose from "mongoose";

const lastMessageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      default: "",
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Userr",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Userr",
        required: true,
      },
    ],
    lastMessage: {
      type: lastMessageSchema,
      default: null,
    },
    hiddenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Userr",
      },
    ],
  },
  { timestamps: true }
);

// Index for fast lookups of conversations by participant
conversationSchema.index({ participants: 1 });

const conversationModel = mongoose.model("Conversation", conversationSchema);

export default conversationModel;
