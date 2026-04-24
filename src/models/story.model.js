import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Userr",
    required: true,
  },
  mediaUrl: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ["image", "video"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // MongoDB Automatically deletes documents perfectly after 24 hrs
  },
});

const StoryModel = mongoose.model("Story", storySchema);

export default StoryModel;
