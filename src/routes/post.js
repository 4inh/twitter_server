import { Router } from "express";
import Post from "../models/Post.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

// Get all posts
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("author", "username email displayName profilePicture") // Populate author with selected fields
            .populate("likes", "username email displayName profilePicture") // Populate likes to get user details
            .populate(
                "comments.user",
                "username email displayName profilePicture"
            ) // Populate user in comments
            .populate("mentions", "username email displayName profilePicture")
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: "Error fetching posts" });
    }
});

// Create a new post and emit via Socket.io
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { content, media, tags, mentions, visibility } = req.body;
        const newPost = new Post({
            content,
            author: req.user.id, // Logged-in user
            media,
            tags,
            mentions,
            visibility,
        });

        const savedPost = await newPost.save();

        // Emit the new post event for real-time update
        req.app.locals.io.emit("new-post", savedPost);
        res.status(201).json(savedPost);
    } catch (err) {
        res.status(500).json({ error: "Error creating post" });
    }
});

// Update a post
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedPost);
    } catch (err) {
        res.status(500).json({ error: "Error updating post" });
    }
});

// Delete a post
// @ts-ignore
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: "Post deleted" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting post" });
    }
});

router.get("/top-tags", async (req, res) => {
    try {
        const topTags = await Post.aggregate([
            { $unwind: "$tags" }, // Deconstruct the tags array
            { $group: { _id: "$tags", count: { $sum: 1 } } }, // Count each tag
            { $sort: { count: -1 } }, // Sort by count descending
            { $limit: 5 }, // Get top 5
        ]);

        res.json(topTags);
    } catch (err) {
        res.status(500).json({ error: "Error fetching top tags" });
    }
});

router.get("/search", async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        const posts = await Post.find({
            $or: [
                { tags: { $regex: query, $options: "i" } }, // Search by tag
                { content: { $regex: query, $options: "i" } }, // Search by content
            ],
        })
            .populate({
                path: "author",
                match: { username: { $regex: query, $options: "i" } }, // Search by username
                select: "username email",
            })
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: "Error searching posts" });
    }
});

export default router;
