import { Types } from "mongoose";
import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
    {
        content: { type: String, required: true, trim: true },

        author: { type: Types.ObjectId, ref: "User", required: true }, // Reference to User model

        media: [{ type: String }],

        likes: [{ type: Types.ObjectId, ref: "User" }], // Users who liked the post

        comments: [
            {
                user: { type: Types.ObjectId, ref: "User", required: true }, // Commented user
                text: { type: String, required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],

        visibility: {
            type: String,
            enum: ["public", "private", "followers-only"],
            default: "public",
        },

        tags: [{ type: String, lowercase: true, trim: true }],

        mentions: [{ type: Types.ObjectId, ref: "User" }],

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date },
    },
    { timestamps: true }
);

const Post = mongoose.model("Post", PostSchema);

export default Post;
