import authMiddleware from "../middlewares/authMiddleware.js";
import { Router } from "express";
import Message from "../models/Message.js";
import { formatResponse } from "../utils/index.js";

const router = Router();

// Send message
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { receiverId, content, media } = req.body;

        const message = new Message({
            senderId: req.user.id,
            receiverId,
            content,
            media,
        });

        await message.save();
        req.app.locals.io.emit("newMessage", message);
        res.status(201).json(
            formatResponse("send message successfully", message, null)
        );
    } catch (error) {
        res.status(500).json(
            formatResponse("Failed to send message", null, error.message)
        );
    }
});

// Get messages
router.get("/:receiverId", authMiddleware, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { senderId: req.user.id, receiverId: req.params.receiverId },
                { senderId: req.params.receiverId, receiverId: req.user.id },
            ],
        }).sort({ timestamp: 1 });

        res.status(200).json(
            formatResponse("get messages successfully", messages, null)
        );
    } catch (error) {
        res.status(500).json(
            formatResponse("Failed to fetch messages", null, error.message)
        );
    }
});

export default router;
