import { Router } from "express";
import Post from "../models/Post.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import cloudinary from "../config/cloudinary.js";
import upload from "../config/multer.js";
import { formatResponse, validateObjectId } from "../utils/index.js";
import Notification from "../models/Notification.js";
const router = Router();

// Validate post data
const validatePostData = (req, res, next) => {
    const { content, visibility } = req.body;

    // Validate content
    if (!content || content.trim() === "") {
        return res
            .status(400)
            .json(
                formatResponse(
                    "Post content is required",
                    null,
                    "CONTENT_REQUIRED"
                )
            );
    }

    // Validate visibility if provided
    if (visibility && !["public", "private", "friends"].includes(visibility)) {
        return res
            .status(400)
            .json(
                formatResponse(
                    "Invalid visibility option",
                    null,
                    "INVALID_VISIBILITY"
                )
            );
    }

    next();
};
// router.post(
//     "/",
//     authMiddleware,
//     upload.array("media"),
//     validatePostData,
//     async (req, res) => {
//         try {
//             const { content, tags, mentions, visibility } = req.body;

//             const files = req.files ?? [];

//             const uploadPromises = files.map((file) => {
//                 return new Promise((resolve, reject) => {
//                     cloudinary.uploader
//                         .upload_stream({ folder: "posts" }, (error, result) => {
//                             if (error) return reject(error);
//                             resolve(result?.secure_url);
//                         })
//                         .end(file.buffer);
//                 });
//             });

//             const mediaUrls = await Promise.all(uploadPromises);
//             const cleanUrls = mediaUrls.filter((url) => url);

//             // Parse mentions if provided
//             let parsedMentions = [];
//             if (mentions) {
//                 try {
//                     parsedMentions = JSON.parse(mentions);
//                 } catch (error) {
//                     return res
//                         .status(400)
//                         .json(
//                             formatResponse(
//                                 "Invalid mentions format",
//                                 null,
//                                 "INVALID_MENTIONS"
//                             )
//                         );
//                 }
//             }

//             // Parse tags if provided
//             let parsedTags = [];
//             if (tags) {
//                 try {
//                     parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
//                 } catch (error) {
//                     return res
//                         .status(400)
//                         .json(
//                             formatResponse(
//                                 "Invalid tags format",
//                                 null,
//                                 "INVALID_TAGS"
//                             )
//                         );
//                 }
//             }

//             const newPost = new Post({
//                 content,
//                 author: req.user.id,
//                 media: cleanUrls,
//                 tags: parsedTags,
//                 mentions: parsedMentions,
//                 visibility: visibility || "public",
//             });

//             const savedPost = await newPost.save();

//             if (parsedMentions.length > 0) {
//                 const notifications = parsedMentions.map((userId) => ({
//                     userId,
//                     senderId: req.user.id,
//                     type: "mention",
//                     postId: savedPost._id,
//                     message: `You were mentioned in a post by ${req.user.username}.`,
//                 }));

//                 await Notification.insertMany(notifications);

//                 // Emit real-time notifications
//                 parsedMentions.forEach((userId) => {
//                     req.app.locals.io
//                         .to(userId.toString())
//                         .emit("notification", {
//                             message: `You were mentioned in a post.`,
//                             postId: savedPost._id,
//                             type: "mention",
//                             userId,
//                             senderId: req.user.id,
//                         });
//                 });
//             }
//             req.app.locals.io.emit("new-post", savedPost);

//             res.status(201).json(
//                 formatResponse("Post created successfully", savedPost, null)
//             );
//         } catch (err) {
//             console.error("Error creating post:", err);
//             res.status(500).json(
//                 formatResponse("Failed to create post", null, err.message)
//             );
//         }
//     }
// );

// Get all posts
router.post(
    "/",
    authMiddleware,
    upload.array("media"),
    validatePostData,
    async (req, res) => {
        try {
            const { content, tags, mentions, visibility } = req.body;

            const files = req.files ?? [];

            const uploadPromises = files.map((file) => {
                return new Promise((resolve, reject) => {
                    cloudinary.uploader
                        .upload_stream({ folder: "posts" }, (error, result) => {
                            if (error) return reject(error);
                            resolve(result?.secure_url);
                        })
                        .end(file.buffer);
                });
            });

            const mediaUrls = await Promise.all(uploadPromises);
            const cleanUrls = mediaUrls.filter((url) => url);

            // Parse mentions if provided
            let parsedMentions = [];
            if (mentions) {
                try {
                    console.log("mentions", mentions);

                    parsedMentions = JSON.parse(mentions);
                } catch (error) {
                    return res
                        .status(400)
                        .json(
                            formatResponse(
                                "Invalid mentions format",
                                null,
                                "INVALID_MENTIONS"
                            )
                        );
                }
            }

            // Parse tags if provided
            let parsedTags = [];
            if (tags) {
                try {
                    parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
                } catch (error) {
                    return res
                        .status(400)
                        .json(
                            formatResponse(
                                "Invalid tags format",
                                null,
                                "INVALID_TAGS"
                            )
                        );
                }
            }

            const newPost = new Post({
                content,
                author: req.user.id,
                media: cleanUrls,
                tags: parsedTags,
                mentions: parsedMentions,
                visibility: visibility || "public",
            });

            const savedPost = await newPost.save();

            // Populate the saved post with the same fields as in GET route
            const populatedPost = await Post.findById(savedPost._id)
                .populate("author", "username email displayName profilePicture")
                .populate("likes", "username email displayName profilePicture")
                .populate(
                    "comments.user",
                    "username email displayName profilePicture"
                )
                .populate(
                    "mentions",
                    "username email displayName profilePicture"
                );

            if (parsedMentions.length > 0) {
                const notifications = parsedMentions.map((userId) => ({
                    userId,
                    senderId: req.user.id,
                    type: "mention",
                    postId: savedPost._id,
                    message: `You were mentioned in a post by ${req.user.username}.`,
                }));

                await Notification.insertMany(notifications);

                // Emit real-time notifications
                parsedMentions.forEach((userId) => {
                    req.app.locals.io
                        .to(userId.toString())
                        .emit("notification", {
                            message: `Bạn đã được nhắc đến trong một bài đăng.`,
                            postId: savedPost._id,
                            type: "mention",
                            userId,
                            senderId: req.user.id,
                        });
                });
            }
            // Emit the populated post instead of savedPost
            req.app.locals.io.emit("new-post", populatedPost);

            res.status(201).json(
                formatResponse("Post created successfully", populatedPost, null)
            );
        } catch (err) {
            console.error("Error creating post:", err);
            res.status(500).json(
                formatResponse("Failed to create post", null, err.message)
            );
        }
    }
);
router.get("/", authMiddleware, async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("author", "username email displayName profilePicture")
            .populate("likes", "username email displayName profilePicture")
            .populate(
                "comments.user",
                "username email displayName profilePicture"
            )
            .populate("mentions", "username email displayName profilePicture")
            .sort({ createdAt: -1 });

        res.json(formatResponse("Posts retrieved successfully", posts, null));
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).json(
            formatResponse("Failed to fetch posts", null, err.message)
        );
    }
});
router.get("/user/:userId", authMiddleware, async (req, res) => {
    try {
        if (!req.params.userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res
                .status(400)
                .json(
                    formatResponse("Invalid user ID format", null, "INVALID_ID")
                );
        }
        const posts = await Post.find({
            author: {
                _id: req.params.userId,
            },
            visibility: "public",
        })
            .populate("author", "username email displayName profilePicture")
            .populate("likes", "username email displayName profilePicture")
            .populate(
                "comments.user",
                "username email displayName profilePicture"
            )
            .populate("mentions", "username email displayName profilePicture")
            .sort({ createdAt: -1 });

        res.json(formatResponse("Posts retrieved successfully", posts, null));
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).json(
            formatResponse("Failed to fetch posts", null, err.message)
        );
    }
});
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const posts = await Post.find({
            author: {
                _id: req.user.id,
            },
        })
            .populate("author", "username email displayName profilePicture")
            .populate("likes", "username email displayName profilePicture")
            .populate(
                "comments.user",
                "username email displayName profilePicture"
            )
            .populate("mentions", "username email displayName profilePicture")
            .sort({ createdAt: -1 });

        res.json(formatResponse("Posts retrieved successfully", posts, null));
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).json(
            formatResponse("Failed to fetch posts", null, err.message)
        );
    }
});
router.get("/top-tags", authMiddleware, async (req, res) => {
    try {
        const topTags = await Post.aggregate([
            { $unwind: "$tags" }, // Deconstruct the tags array
            { $group: { _id: "$tags", count: { $sum: 1 } } }, // Count each tag
            { $sort: { count: -1 } }, // Sort by count descending
            { $limit: 5 }, // Get top 5
        ]);

        res.json(
            formatResponse("Top tags retrieved successfully", topTags, null)
        );
    } catch (err) {
        console.error("Error fetching top tags:", err);
        res.status(500).json(
            formatResponse("Failed to fetch top tags", null, err.message)
        );
    }
});

router.get("/search", authMiddleware, async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res
                .status(400)
                .json(
                    formatResponse(
                        "No search query provided",
                        null,
                        "QUERY_REQUIRED"
                    )
                );
        }

        const posts = await Post.find({
            $or: [
                { tags: { $regex: query, $options: "i" } }, // Search by tag
                { content: { $regex: query, $options: "i" } }, // Search by content
            ],
            visibility: "public",
        })
            .populate({
                path: "author",
                match: { username: { $regex: query, $options: "i" } }, // Search by username
                select: "username email displayName profilePicture",
            })
            .populate("likes", "username email displayName profilePicture")
            .populate(
                "comments.user",
                "username email displayName profilePicture"
            )
            .populate("mentions", "username email displayName profilePicture")
            .sort({ createdAt: -1 });

        res.json(formatResponse("Search results retrieved", posts, null));
    } catch (err) {
        console.error("Error searching posts:", err);
        res.status(500).json(
            formatResponse("Failed to search posts", null, err.message)
        );
    }
});
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        // Validate ID format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res
                .status(400)
                .json(
                    formatResponse("Invalid post ID format", null, "INVALID_ID")
                );
        }

        const post = await Post.findById(req.params.id)
            .populate("author", "username email displayName profilePicture")
            .populate("likes", "username email displayName profilePicture")
            .populate(
                "comments.user",
                "username email displayName profilePicture"
            )
            .populate("mentions", "username email displayName profilePicture");

        if (!post) {
            return res
                .status(404)
                .json(formatResponse("Post not found", null, "POST_NOT_FOUND"));
        }

        res.json(formatResponse("Post retrieved successfully", post, null));
    } catch (err) {
        console.error("Error fetching post:", err);
        res.status(500).json(
            formatResponse("Failed to fetch post", null, err.message)
        );
    }
});
// Create a new post and emit via Socket.io

// Update a post
router.put(
    "/:id",
    authMiddleware,
    upload.array("media"),
    validatePostData,
    async (req, res) => {
        try {
            const { content, tags, mentions, visibility } = req.body;

            // Validate ID format
            if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
                return res
                    .status(400)
                    .json(
                        formatResponse(
                            "Invalid post ID format",
                            null,
                            "INVALID_ID"
                        )
                    );
            }

            // Check if post exists and user is the author
            const post = await Post.findById(req.params.id);
            if (!post) {
                return res
                    .status(404)
                    .json(
                        formatResponse("Post not found", null, "POST_NOT_FOUND")
                    );
            }

            // Verify the user is the author of the post
            if (post.author.toString() !== req.user.id) {
                return res
                    .status(403)
                    .json(
                        formatResponse(
                            "Unauthorized to update this post",
                            null,
                            "UNAUTHORIZED"
                        )
                    );
            }

            const files = req.files ?? [];

            const uploadPromises = files.map((file) => {
                return new Promise((resolve, reject) => {
                    cloudinary.uploader
                        .upload_stream({ folder: "posts" }, (error, result) => {
                            if (error) return reject(error);
                            resolve(result?.secure_url);
                        })
                        .end(file.buffer);
                });
            });

            const mediaUrls = await Promise.all(uploadPromises);
            const cleanUrls = mediaUrls.filter((url) => url);

            // Parse mentions if provided
            let parsedMentions = [];
            if (mentions) {
                try {
                    parsedMentions = JSON.parse(mentions);
                } catch (error) {
                    return res
                        .status(400)
                        .json(
                            formatResponse(
                                "Invalid mentions format",
                                null,
                                "INVALID_MENTIONS"
                            )
                        );
                }
            }

            // Parse tags if provided
            let parsedTags = [];
            if (tags) {
                try {
                    parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
                } catch (error) {
                    return res
                        .status(400)
                        .json(
                            formatResponse(
                                "Invalid tags format",
                                null,
                                "INVALID_TAGS"
                            )
                        );
                }
            }

            // Find the post and update its content
            const updatedPost = await Post.findByIdAndUpdate(
                req.params.id,
                {
                    content,
                    tags: parsedTags,
                    mentions: parsedMentions,
                    visibility,
                    $push: { media: { $each: cleanUrls } }, // Append new media to existing ones
                },
                { new: true }
            );

            // req.app.locals.io.emit("update-post", updatedPost);
            res.json(
                formatResponse("Post updated successfully", updatedPost, null)
            );
        } catch (err) {
            console.error("Error updating post:", err);
            res.status(500).json(
                formatResponse("Failed to update post", null, err.message)
            );
        }
    }
);

// Delete a post
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        // Validate ID format
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res
                .status(400)
                .json(
                    formatResponse("Invalid post ID format", null, "INVALID_ID")
                );
        }

        // Check if post exists and user is the author
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res
                .status(404)
                .json(formatResponse("Post not found", null, "POST_NOT_FOUND"));
        }

        // Verify the user is the author of the post
        if (
            req.user.role !== "admin" &&
            post.author.toString() !== req.user.id
        ) {
            return res
                .status(403)
                .json(
                    formatResponse(
                        "Unauthorized to delete this post",
                        null,
                        "UNAUTHORIZED"
                    )
                );
        }

        await Post.findByIdAndDelete(req.params.id);
        req.app.locals.io.emit("delete-post", req.params.id);
        res.json(
            formatResponse(
                "Post deleted successfully",
                { id: req.params.id },
                null
            )
        );
    } catch (err) {
        console.error("Error deleting post:", err);
        res.status(500).json(
            formatResponse("Failed to delete post", null, err.message)
        );
    }
});
router.post("/:id/like", authMiddleware, async (req, res) => {
    try {
        // Validate ID format
        if (!validateObjectId(req.params.id)) {
            return res
                .status(400)
                .json(
                    formatResponse("Invalid post ID format", null, "INVALID_ID")
                );
        }

        // Find the post
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res
                .status(404)
                .json(formatResponse("Post not found", null, "POST_NOT_FOUND"));
        }

        // Check if user already liked the post
        const alreadyLiked = post.likes.some(
            (userId) => userId.toString() === req.user.id
        );

        let updatedPost;

        if (alreadyLiked) {
            // Unlike the post
            updatedPost = await Post.findByIdAndUpdate(
                req.params.id,
                { $pull: { likes: req.user.id } },
                { new: true }
            )
                .populate("author", "username email displayName profilePicture")
                .populate("likes", "username email displayName profilePicture");

            req.app.locals.io.emit("unlike-post", {
                postId: post._id,
                userId: req.user.id,
            });

            res.json(
                formatResponse("Post unliked successfully", updatedPost, null)
            );
        } else {
            // Like the post
            updatedPost = await Post.findByIdAndUpdate(
                req.params.id,
                { $addToSet: { likes: req.user.id } },
                { new: true }
            )
                .populate("author", "username email displayName profilePicture")
                .populate("likes", "username email displayName profilePicture");

            req.app.locals.io.emit("like-post", {
                postId: post._id,
                userId: req.user.id,
            });

            res.json(
                formatResponse("Post liked successfully", updatedPost, null)
            );
        }
    } catch (err) {
        console.error("Error liking/unliking post:", err);
        res.status(500).json(
            formatResponse("Failed to like/unlike post", null, err.message)
        );
    }
});

// Add a comment to a post
router.post("/:id/comment", authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;

        // Validate ID format
        if (!validateObjectId(req.params.id)) {
            return res
                .status(400)
                .json(
                    formatResponse("Invalid post ID format", null, "INVALID_ID")
                );
        }

        // Validate comment text
        if (!text || text.trim() === "") {
            return res
                .status(400)
                .json(
                    formatResponse(
                        "Comment text is required",
                        null,
                        "COMMENT_TEXT_REQUIRED"
                    )
                );
        }

        // Find the post
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res
                .status(404)
                .json(formatResponse("Post not found", null, "POST_NOT_FOUND"));
        }

        // Create new comment
        const newComment = {
            user: req.user.id,
            text: text.trim(),
        };

        // Add comment to post
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            { $push: { comments: newComment } },
            { new: true }
        )
            .populate("author", "username email displayName profilePicture")
            .populate("likes", "username email displayName profilePicture")
            .populate(
                "comments.user",
                "username email displayName profilePicture"
            );

        // Get the newly added comment (last comment in the array)
        const addedComment =
            updatedPost.comments[updatedPost.comments.length - 1];

        req.app.locals.io.emit("new-comment", {
            postId: post._id,
            comment: addedComment,
        });

        res.status(201).json(
            formatResponse(
                "Comment added successfully",
                {
                    post: updatedPost,
                    comment: addedComment,
                },
                null
            )
        );
    } catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json(
            formatResponse("Failed to add comment", null, err.message)
        );
    }
});

// Delete a comment
router.delete(
    "/:postId/comment/:commentId",
    authMiddleware,
    async (req, res) => {
        try {
            const { postId, commentId } = req.params;

            // Validate IDs format
            if (!validateObjectId(postId) || !validateObjectId(commentId)) {
                return res
                    .status(400)
                    .json(
                        formatResponse("Invalid ID format", null, "INVALID_ID")
                    );
            }

            // Find the post
            const post = await Post.findById(postId);
            if (!post) {
                return res
                    .status(404)
                    .json(
                        formatResponse("Post not found", null, "POST_NOT_FOUND")
                    );
            }

            // Find the comment
            const comment = post.comments.id(commentId);
            if (!comment) {
                return res
                    .status(404)
                    .json(
                        formatResponse(
                            "Comment not found",
                            null,
                            "COMMENT_NOT_FOUND"
                        )
                    );
            }

            // Check if the user is authorized to delete the comment (comment author or post author)
            if (
                comment.user.toString() !== req.user.id &&
                post.author.toString() !== req.user.id
            ) {
                return res
                    .status(403)
                    .json(
                        formatResponse(
                            "Unauthorized to delete this comment",
                            null,
                            "UNAUTHORIZED"
                        )
                    );
            }

            // Remove the comment
            await Post.findByIdAndUpdate(postId, {
                $pull: { comments: { _id: commentId } },
            });

            req.app.locals.io.emit("delete-comment", {
                postId,
                commentId,
            });

            res.json(
                formatResponse(
                    "Comment deleted successfully",
                    { postId, commentId },
                    null
                )
            );
        } catch (err) {
            console.error("Error deleting comment:", err);
            res.status(500).json(
                formatResponse("Failed to delete comment", null, err.message)
            );
        }
    }
);
export default router;
