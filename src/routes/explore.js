import express from "express";
import { Types } from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { formatResponse } from "../utils/index.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
    const query = req.query.query?.trim();

    if (!query) {
        return res
            .status(400)
            .json(
                formatResponse(
                    "Query parameter is required",
                    null,
                    "Missing query"
                )
            );
    }

    try {
        const regex = new RegExp(query, "i"); // Case-insensitive search

        // Search Users
        const users = await User.find({
            $or: [
                { username: regex },
                { displayName: regex },
                { email: regex },
            ],
        })
            .select("-password")
            .populate("following", "username displayName profilePicture email")
            .populate("followers", "username displayName profilePicture email");

        // Search Posts
        const posts = await Post.find({
            visibility: "public",
            $or: [{ content: regex }, { tags: regex }],
        })
            .populate("author", "username email displayName profilePicture")
            .populate("likes", "username email displayName profilePicture")
            .populate(
                "comments.user",
                "username email displayName profilePicture"
            )
            .populate("mentions", "username email displayName profilePicture");

        res.json(
            formatResponse(
                "Explore results retrieved successfully",
                { users, posts },
                null
            )
        );
    } catch (err) {
        console.error("Error in explore route:", err);
        res.status(500).json(
            formatResponse("Explore failed", null, err.message)
        );
    }
});

router.get("/autocomplete", authMiddleware, async (req, res) => {
    const query = req.query.query?.trim();
    const limit = parseInt(req.query.limit) || 5;

    if (!query) {
        return res
            .status(400)
            .json(
                formatResponse(
                    "Query parameter is required",
                    null,
                    "Missing query"
                )
            );
    }

    try {
        const regex = new RegExp(`^${query}`, "i"); // Starts with, case-insensitive
        const tagRegex = new RegExp(`^#${query}`, "i");
        // Autocomplete for users
        const users = await User.find({
            $or: [
                { username: regex },
                { displayName: regex },
                { email: regex },
            ],
        })
            .select("-password")
            .populate("following", "username displayName profilePicture email")
            .populate("followers", "username displayName profilePicture email");

        // Autocomplete for tags from public posts
        const tagResults = await Post.aggregate([
            { $match: { visibility: "public" } },
            { $unwind: "$tags" },
            { $match: { tags: { $regex: tagRegex } } },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit },
        ]);

        const tags = tagResults.map((t) => t._id);

        res.json(
            formatResponse(
                "Autocomplete results retrieved",
                { users, tags },
                null
            )
        );
    } catch (err) {
        console.error("Autocomplete error:", err);
        res.status(500).json(
            formatResponse(
                "Failed to fetch autocomplete results",
                null,
                err.message
            )
        );
    }
});
export default router;
