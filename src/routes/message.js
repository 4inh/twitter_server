import authMiddleware from "../middlewares/authMiddleware.js";
import { Router } from "express";
import Message from "../models/Message.js";

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
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: "Failed to send message", error });
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

        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch messages", error });
    }
});

export default router;
