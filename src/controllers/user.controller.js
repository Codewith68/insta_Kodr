import userModel from "../models/user.model.js";
import { uploadFile } from "../services/auth.services.js";

/**
 * GET /api/users/search?q=abhi
 */

export const searchUser = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== 'string' || q.trim() === '') {
            return res.status(200).json({
                message: "No query provided",
                users: []
            });
        }

        const users = await userModel.aggregate([
            {
                $match: {
                    username: { $regex: q, $options: "i" }
                }
            },
            {
                $project: {
                    username: 1,
                    fullname: 1,
                    profilePic: 1
                }
            }
        ]);

        res.status(200).json({
            message: "Users fetched successfully",
            users
        });
    } catch (error) {
        console.error("Search user error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}


/**
 * POST /api/users/follow/:id
 * Toggles Follow / Unfollow status based on if the user ID exists inherently inside arrays.
 */

export const toggleFollowUser = async (req, res) => {
    try {
        const { id: targetUserId } = req.params;
        const currentUserId = req.user.id;

        if (targetUserId === currentUserId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const targetUser = await userModel.findById(targetUserId);
        const currentUser = await userModel.findById(currentUserId);

        if (!targetUser || !currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const isFollowing = currentUser.following.includes(targetUserId);
        const isRequested = currentUser.sentRequests?.includes(targetUserId);

        if (isFollowing) {
            // Unfollow Target natively
            await userModel.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
            await userModel.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
            return res.status(200).json({ message: "Unfollowed successfully", status: "unfollowed" });
        } else if (isRequested) {
            // Cancel already sent incoming request silently
            await userModel.findByIdAndUpdate(currentUserId, { $pull: { sentRequests: targetUserId } });
            await userModel.findByIdAndUpdate(targetUserId, { $pull: { followRequests: currentUserId } });
            return res.status(200).json({ message: "Follow request cancelled", status: "cancelled" });
        } else {
            // Enforce private Request pipeline bypassing instant follower tracking!
            await userModel.findByIdAndUpdate(currentUserId, { $push: { sentRequests: targetUserId } });
            await userModel.findByIdAndUpdate(targetUserId, { $push: { followRequests: currentUserId } });
            return res.status(200).json({ message: "Follow request sent", status: "requested" });
        }
    } catch (error) {
        console.error("Toggle follow error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * POST /api/users/accept-request/:id
 * Approves a mapped follow request moving dependencies into main generic follower lists handling state arrays accurately.
 */
export const acceptFollowRequest = async (req, res) => {
    try {
        const requesterId = req.params.id;
        const currentUserId = req.user.id; // Target user accepting the hit

        // Drop from pending request boxes
        await userModel.findByIdAndUpdate(currentUserId, { $pull: { followRequests: requesterId } });
        await userModel.findByIdAndUpdate(requesterId, { $pull: { sentRequests: currentUserId } });

        // Add to permanent follower arrays ensuring relationships
        await userModel.findByIdAndUpdate(currentUserId, { $addToSet: { followers: requesterId } });
        await userModel.findByIdAndUpdate(requesterId, { $addToSet: { following: currentUserId } });

        res.status(200).json({ message: "Follow request accepted" });
    } catch (error) {
        console.error("Accept request error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * POST /api/users/reject-request/:id
 * Declines request dropping tracked ObjectID parameters securely.
 */
export const rejectFollowRequest = async (req, res) => {
    try {
        const requesterId = req.params.id;
        const currentUserId = req.user.id;

        // Strip pending boundaries from arrays 
        await userModel.findByIdAndUpdate(currentUserId, { $pull: { followRequests: requesterId } });
        await userModel.findByIdAndUpdate(requesterId, { $pull: { sentRequests: currentUserId } });

        res.status(200).json({ message: "Follow request rejected" });
    } catch (error) {
        console.error("Reject request error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * GET /api/users/follow-requests
 * Exposes securely populated list elements mapping requester user icons matching notification UI demands natively.
 */
export const getPendingRequests = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const user = await userModel.findById(currentUserId)
            .select("followRequests")
            .populate("followRequests", "username fullname profilePic");

        res.status(200).json({ message: "Requests fetched", data: user.followRequests });
    } catch (error) {
        console.error("Fetch requests error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


/**
 * GET /api/users/:id/connections
 * Fetches fully populated lists for UI popups replacing dummy numbers avoiding network load overheads.
 */
export const getUserConnections = async (req, res) => {
    try {
        const { id } = req.params;

        const userConnections = await userModel.findById(id)
            .select("followers following")
            .populate("followers", "username fullname profilePic")
            .populate("following", "username fullname profilePic");

        if (!userConnections) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Connections fetched successfully",
            data: userConnections
        });
    } catch (error) {
        console.error("Connections fetch error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


/**
 * PUT /api/users/profile
 * Updates the authenticated user's profile (fullname, username, bio, profilePic).
 */
export const updateProfile = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { fullname, username, bio } = req.body;

        const updates = {};

        if (fullname && fullname.trim()) {
            updates.fullname = fullname.trim();
        }

        if (bio !== undefined) {
            updates.bio = bio.trim().slice(0, 150);
        }

        if (username && username.trim()) {
            const normalized = username.trim().toLowerCase();
            // Check if username is already taken by another user
            const existing = await userModel.findOne({ username: normalized, _id: { $ne: currentUserId } });
            if (existing) {
                return res.status(400).json({ message: "Username is already taken" });
            }
            updates.username = normalized;
        }

        // Handle profile pic upload
        if (req.file) {
            const result = await uploadFile(req.file.buffer, req.file.originalname, "/profile-pics");
            updates.profilePic = result.url;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const updatedUser = await userModel.findByIdAndUpdate(currentUserId, updates, { new: true }).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                fullname: updatedUser.fullname,
                profilePic: updatedUser.profilePic,
                bio: updatedUser.bio || "",
                followers: updatedUser.followers || [],
                following: updatedUser.following || [],
                followRequests: updatedUser.followRequests || [],
                sentRequests: updatedUser.sentRequests || [],
            }
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
