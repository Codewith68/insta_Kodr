import StoryModel from "../models/story.model.js";
import { uploadFile } from "../services/auth.services.js";

function getMediaType(mimetype = "") {
  if (mimetype.startsWith("video/")) {
    return "video";
  }
  return "image";
}

export async function uploadStory(req, res) {
  try {
    const userId = req.user?.id || req.body.user;
    const files = req.files;

    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "Please upload media files" });
    }

    const createdStories = [];

    await Promise.all(
      files.map(async (file) => {
        const result = await uploadFile(
          file.buffer,
          file.originalname,
          "/stories"
        );

        const newStory = await StoryModel.create({
          author: userId,
          mediaUrl: result.url,
          mediaType: getMediaType(file.mimetype),
        });

        await newStory.populate("author", "-password");
        createdStories.push(newStory);
      })
    );

    return res.status(201).json({
      message: "Stories uploaded successfully",
      data: createdStories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Something went wrong while uploading story",
    });
  }
}

export async function getMyStories(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    const stories = await StoryModel.find({ author: userId }).sort({ createdAt: 1 }).populate("author", "-password");
    
    return res.status(200).json({
      message: "Stories fetched successfully",
      data: stories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Error fetching stories",
    });
  }
}
