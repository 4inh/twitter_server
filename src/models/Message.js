import mongoose from "mongoose";
const { Schema } = mongoose;

const MessageSchema = new Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            trim: true,
        },
        media: {
            type: [
                {
                    url: { type: String, required: true },
                    type: {
                        type: String,
                        enum: ["image", "video"],
                        required: true,
                    },
                },
            ],
            default: [],
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", MessageSchema);

export default Message;
