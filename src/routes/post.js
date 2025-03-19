import { Router } from "express";
import Post from "../models/Post.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

// Get all posts
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
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

export default router;
