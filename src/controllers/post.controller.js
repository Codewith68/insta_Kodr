import postModel from "../models/post.model.js";
import { uploadFile } from "../services/auth.services.js";

function getMediaType(mimetype = "") {
  if (mimetype.startsWith("video/")) {
    return "video";
  }

  return "image";
}

export async function createPost(req, res) {
  try {
    const userId = req.user?.id || req.body.user;
    const { caption = "" } = req.body;
    const files = req.files || [];

    if (!userId) {
      return res.status(400).json({
        message: "User id is required",
      });
    }

    if (!files.length) {
      return res.status(400).json({
        message: "Please upload at least one media file",
      });
    }

    const uploadedMedia = await Promise.all(
      files.map(async (file) => {
        const result = await uploadFile(
          file.buffer,
          file.originalname,
          "/posts",
        );

        return {
          url: result.url,
          mediaType: getMediaType(file.mimetype),
        };
      }),
    );

    const post = await postModel.create({
      caption,
      media: uploadedMedia,
      author: userId,
    });

    await post.populate("author", "-password");

    return res.status(201).json({
      message: "Post created successfully",
      data: post,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Something went wrong while creating post",
    });
  }
}

export async function getPosts(req, res) {
  try {
    const posts = await postModel.find().populate("author", "-password");
    if(!posts){
      return res.status(404).json({
        message:"No posts found"
      })
    }
    return res.status(200).json({
      message: "Posts fetched successfully",
      data: posts,
    });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: error.message || "Something went wrong while fetching posts",
      });
    }
}

export async function getUserPosts(req, res) {
  try {
    const { userId } = req.params;
    const posts = await postModel.find({ author: userId }).populate("author", "-password");
    if(!posts){
      return res.status(404).json({
        message:"No posts found"
      })
    }
    return res.status(200).json({
      message: "User posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Something went wrong while fetching user posts",
    });
  } 
}
