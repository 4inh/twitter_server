import { Router } from "express";
import User from "../models/User.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import bcrypt from "bcryptjs";
import cloudinary from "../config/cloudinary.js";
import upload from "../config/multer.js";
import { formatResponse, validateObjectId } from "../utils/index.js";
import Notification from "../models/Notification.js";

const router = Router();
// Search users
router.get("/search", authMiddleware, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res
                .status(400)
                .json(
                    formatResponse(
                        "Search query is required",
                        null,
                        "QUERY_REQUIRED"
                    )
                );
        }

        const users = await User.find({
            $or: [
                { username: { $regex: q, $options: "i" } }, // Case-insensitive username search
                { displayName: { $regex: q, $options: "i" } }, // Case-insensitive display name search
                { email: { $regex: q, $options: "i" } }, // Case-insensitive email search
            ],
        })
            .select("username displayName profilePicture email") // Only return necessary fields
            .limit(10); // Limit results

        res.json(formatResponse("Users found", users, null));
    } catch (err) {
        console.error("Error searching users:", err);
        res.status(500).json(
            formatResponse("Failed to search users", null, err.message)
        );
    }
});
// router.get("/friends", authMiddleware, async (req, res) => {
//     try {
//         const user = await User.findById(req.user.id).populate(
//             "friends",
//             "username displayName profilePicture email"
//         );
//         if (!user) {
//             return res
//                 .status(404)
//                 .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
//         }
//         res.json(
//             formatResponse("Get friends successfully", user.friends, null)
//         );
//     } catch (error) {
//         res.status(500).json(
//             formatResponse("Failed to fetch friends", null, err.message)
//         );
//     }
// });

router.get("/friends", authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id)
            .select("following followers")
            .lean();

        if (!currentUser) {
            return res
                .status(404)
                .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
        }

        // Find users who are both in your following list and in your followers list
        const mutualConnections = currentUser.following.filter((userId) =>
            currentUser.followers.some(
                (followerId) => followerId.toString() === userId.toString()
            )
        );

        // Get detailed information about these mutual friends
        const friends = await User.find(
            { _id: { $in: mutualConnections } },
            "username displayName profilePicture email"
        ).lean();

        res.json(formatResponse("Friends fetched successfully", friends, null));
    } catch (err) {
        console.error("Error fetching friends:", err);
        res.status(500).json(
            formatResponse("Failed to fetch friends", null, err.message)
        );
    }
});

// Add/Remove friend
// router.post("/friends/:id", authMiddleware, async (req, res) => {
//     try {
//         if (!validateObjectId(req.params.id)) {
//             return res
//                 .status(400)
//                 .json(
//                     formatResponse("Invalid user ID format", null, "INVALID_ID")
//                 );
//         }

//         // Cannot add yourself as friend
//         if (req.params.id === req.user.id) {
//             return res
//                 .status(400)
//                 .json(
//                     formatResponse(
//                         "Cannot add yourself as friend",
//                         null,
//                         "INVALID_OPERATION"
//                     )
//                 );
//         }

//         const targetUser = await User.findById(req.params.id);
//         if (!targetUser) {
//             return res
//                 .status(404)
//                 .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
//         }

//         const currentUser = await User.findById(req.user.id);

//         // Check if already friends
//         const isAlreadyFriend = currentUser.friends.includes(req.params.id);

//         let updatedUser;

//         if (isAlreadyFriend) {
//             // Remove friend
//             updatedUser = await User.findByIdAndUpdate(
//                 req.user.id,
//                 { $pull: { friends: req.params.id } },
//                 { new: true }
//             )
//                 .select("-password")
//                 .populate(
//                     "friends",
//                     "username displayName profilePicture email"
//                 );

//             // Also remove from target user's friends list
//             await User.findByIdAndUpdate(req.params.id, {
//                 $pull: { friends: req.user.id },
//             });

//             res.json(
//                 formatResponse("Friend removed successfully", updatedUser, null)
//             );
//         } else {
//             // Add friend
//             updatedUser = await User.findByIdAndUpdate(
//                 req.user.id,
//                 { $addToSet: { friends: req.params.id } },
//                 { new: true }
//             )
//                 .select("-password")
//                 .populate(
//                     "friends",
//                     "username displayName profilePicture email"
//                 );

//             // Also add to target user's friends list
//             const friendAdded = await User.findByIdAndUpdate(req.params.id, {
//                 $addToSet: { friends: req.user.id },
//             });

//             const newNotification = new Notification({
//                 userId: req.params.id,
//                 senderId: req.user.id,
//                 type: "follow",
//                 message: `${updatedUser.email} followed you`, // Custom message
//             });

//             await newNotification.save();
//             res.json(
//                 formatResponse("Friend added successfully", updatedUser, null)
//             );
//         }
//     } catch (err) {
//         console.error("Error updating friends list:", err);
//         res.status(500).json(
//             formatResponse("Failed to update friends list", null, err.message)
//         );
//     }
// });

// router.post("/follow/:id", authMiddleware, async (req, res) => {
//     try {
//         if (!validateObjectId(req.params.id)) {
//             return res
//                 .status(400)
//                 .json(
//                     formatResponse("Invalid user ID format", null, "INVALID_ID")
//                 );
//         }

//         // Cannot follow yourself
//         if (req.params.id === req.user.id) {
//             return res
//                 .status(400)
//                 .json(
//                     formatResponse(
//                         "Cannot follow yourself",
//                         null,
//                         "INVALID_OPERATION"
//                     )
//                 );
//         }

//         const targetUser = await User.findById(req.params.id);
//         if (!targetUser) {
//             return res
//                 .status(404)
//                 .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
//         }

//         const currentUser = await User.findById(req.user.id);

//         // Check if already following
//         const isAlreadyFollowing = currentUser.friends.includes(req.params.id);

//         let updatedUser;

//         if (isAlreadyFollowing) {
//             // Unfollow user
//             updatedUser = await User.findByIdAndUpdate(
//                 req.user.id,
//                 { $pull: { friends: req.params.id } },
//                 { new: true }
//             )
//                 .select("-password")
//                 .populate(
//                     "friends",
//                     "username displayName profilePicture email"
//                 );

//             // Remove from target user's followers list
//             // await User.findByIdAndUpdate(req.params.id, {
//             //     $pull: { friends: req.user.id },
//             // });

//             res.json(
//                 formatResponse("Unfollowed successfully", updatedUser, null)
//             );
//         } else {
//             // Follow user
//             updatedUser = await User.findByIdAndUpdate(
//                 req.user.id,
//                 { $addToSet: { friends: req.params.id } },
//                 { new: true }
//             )
//                 .select("-password")
//                 .populate(
//                     "friends",
//                     "username displayName profilePicture email"
//                 );

//             // Add to target user's followers list
//             // await User.findByIdAndUpdate(req.params.id, {
//             //     $addToSet: { friends: req.user.id },
//             // });

//             // Create notification for the target user
//             const newNotification = new Notification({
//                 userId: req.params.id,
//                 senderId: req.user.id,
//                 type: "follow",
//                 message: `${
//                     currentUser.email || currentUser.username
//                 } followed you`,
//             });

//             await newNotification.save();
//             res.json(
//                 formatResponse("Following successfully", updatedUser, null)
//             );
//         }
//     } catch (err) {
//         console.error("Error updating follow status:", err);
//         res.status(500).json(
//             formatResponse("Failed to update follow status", null, err.message)
//         );
//     }
// });
router.post("/follow/:id", authMiddleware, async (req, res) => {
    try {
        if (!validateObjectId(req.params.id)) {
            return res
                .status(400)
                .json(
                    formatResponse("Invalid user ID format", null, "INVALID_ID")
                );
        }

        // Cannot follow yourself
        if (req.params.id === req.user.id) {
            return res
                .status(400)
                .json(
                    formatResponse(
                        "Cannot follow yourself",
                        null,
                        "INVALID_OPERATION"
                    )
                );
        }

        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            return res
                .status(404)
                .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
        }

        const currentUser = await User.findById(req.user.id);

        // Check if already following
        const isAlreadyFollowing = currentUser.following.includes(
            req.params.id
        );

        let updatedUser;

        if (isAlreadyFollowing) {
            // Unfollow user
            updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { $pull: { following: req.params.id } },
                { new: true }
            )
                .select("-password")
                .populate(
                    "following",
                    "username displayName profilePicture email"
                );

            // Remove from target user's followers list
            await User.findByIdAndUpdate(req.params.id, {
                $pull: { followers: req.user.id },
            });

            res.json(
                formatResponse("Unfollowed successfully", updatedUser, null)
            );
        } else {
            // Follow user
            updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { $addToSet: { following: req.params.id } },
                { new: true }
            )
                .select("-password")
                .populate(
                    "following",
                    "username displayName profilePicture email"
                );

            // Add to target user's followers list
            await User.findByIdAndUpdate(req.params.id, {
                $addToSet: { followers: req.user.id },
            });

            // Create notification for the target user
            const newNotification = new Notification({
                userId: req.params.id,
                senderId: req.user.id,
                type: "follow",
                message: `${updatedUser.email} đã theo dõi bạn`, // Custom message
            });

            await newNotification.save();
            res.json(
                formatResponse("Following successfully", updatedUser, null)
            );
        }
    } catch (err) {
        console.error("Error updating follow status:", err);
        res.status(500).json(
            formatResponse("Failed to update follow status", null, err.message)
        );
    }
});
// Get all users (admin only)
router.get("/", authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== "admin") {
            return res
                .status(403)
                .json(
                    formatResponse("Unauthorized access", null, "UNAUTHORIZED")
                );
        }

        const users = await User.find()
            .select("-password") // Exclude password
            .sort({ createdAt: -1 });

        res.json(formatResponse("Users retrieved successfully", users, null));
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json(
            formatResponse("Failed to fetch users", null, err.message)
        );
    }
});

// Get current user profile
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password")
            // .populate("friends", "username displayName profilePicture email")
            .populate("followers", "username displayName profilePicture email")
            .populate("following", "username displayName profilePicture email");
        // console.log("user", user);

        const mutualConnections = user.following.filter((userId) =>
            user.followers.some(
                (followerId) => followerId.toString() === userId.toString()
            )
        );
        // console.log("mutualConnections", mutualConnections);

        // // Get detailed information about these mutual friends
        // const friends = await User.find(
        //     { _id: { $in: mutualConnections } },
        //     "username displayName profilePicture email"
        // ).lean();
        // console.log("friends", friends);

        user.friends = mutualConnections;

        if (!user) {
            return res
                .status(404)
                .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
        }

        res.json(formatResponse("User profile retrieved", user, null));
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json(
            formatResponse("Failed to fetch user profile", null, err.message)
        );
    }
});

// Get user by ID
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        if (!validateObjectId(req.params.id)) {
            return res
                .status(400)
                .json(
                    formatResponse("Invalid user ID format", null, "INVALID_ID")
                );
        }

        const user = await User.findById(req.params.id)
            .select("-password -role") // Exclude sensitive fields
            .populate("friends", "username displayName profilePicture email")
            .populate("followers", "username displayName profilePicture email")
            .populate("following", "username displayName profilePicture email");
        if (!user) {
            return res
                .status(404)
                .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
        }

        res.json(formatResponse("User retrieved successfully", user, null));
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json(
            formatResponse("Failed to fetch user", null, err.message)
        );
    }
});

router.get("/user/:username", authMiddleware, async (req, res) => {
    try {
        if (!req.params.username) {
            return res
                .status(400)
                .json(
                    formatResponse("Missing username", null, "INVALID_USERNAME")
                );
        }

        const user = await User.findOne({ username: req.params.username })
            .select("-password -role") // Exclude sensitive fields
            .populate("friends", "username displayName profilePicture email")
            .populate("followers", "username displayName profilePicture email")
            .populate("following", "username displayName profilePicture email");

        if (!user) {
            return res
                .status(404)
                .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
        }

        res.json(formatResponse("User retrieved successfully", user, null));
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json(
            formatResponse("Failed to fetch user", null, err.message)
        );
    }
});

// Update user
router.put("/", authMiddleware, upload.single("avatar"), async (req, res) => {
    try {
        const { displayName, email, currentPassword, newPassword } = req.body;

        const updateData = {};

        // Add fields to update if provided
        if (displayName) updateData.displayName = displayName;
        if (email) updateData.email = email.toLowerCase();

        // Handle profile picture upload if provided
        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary.uploader
                    .upload_stream(
                        { folder: "profile_pictures" },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    )
                    .end(req.file.buffer);
            });

            updateData.profilePicture = uploadResult.secure_url;
        }

        // Handle password change if provided
        if (newPassword && currentPassword) {
            // Find user to verify current password
            const user = await User.findById(req.user.id);

            // Verify current password
            const isMatch = await bcrypt.compare(
                currentPassword,
                user.password
            );
            if (!isMatch) {
                return res
                    .status(400)
                    .json(
                        formatResponse(
                            "Current password is incorrect",
                            null,
                            "INVALID_PASSWORD"
                        )
                    );
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(newPassword, salt);
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res
                .status(404)
                .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
        }

        res.json(
            formatResponse("User updated successfully", updatedUser, null)
        );
    } catch (err) {
        console.error("Error updating user:", err);

        // Handle duplicate key error (username or email already exists)
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res
                .status(400)
                .json(
                    formatResponse(
                        `${field} already exists`,
                        null,
                        "DUPLICATE_VALUE"
                    )
                );
        }

        res.status(500).json(
            formatResponse("Failed to update user", null, err.message)
        );
    }
});

// Delete user account
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        if (!validateObjectId(req.params.id)) {
            return res
                .status(400)
                .json(
                    formatResponse("Invalid user ID format", null, "INVALID_ID")
                );
        }

        // Only allow admins to delete other users
        if (req.params.id !== req.user.id && req.user.role !== "admin") {
            return res
                .status(403)
                .json(
                    formatResponse(
                        "Unauthorized to delete this user",
                        null,
                        "UNAUTHORIZED"
                    )
                );
        }

        const deletedUser = await User.findByIdAndDelete(req.params.id);

        if (!deletedUser) {
            return res
                .status(404)
                .json(formatResponse("User not found", null, "USER_NOT_FOUND"));
        }

        res.json(
            formatResponse(
                "User deleted successfully",
                { id: req.params.id },
                null
            )
        );
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json(
            formatResponse("Failed to delete user", null, err.message)
        );
    }
});

export default router;
