import mongoose, { Types } from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: Types.ObjectId, ref: "User", required: true },
        senderId: { type: Types.ObjectId, ref: "User", required: true },
        type: {
            type: String,
            enum: [
                "mention",
                "like",
                "comment",
                "follow",
                "message",
                "announcement",
            ],
            required: true,
        },
        postId: { type: Types.ObjectId, ref: "Post" },
        message: { type: String, required: true },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
