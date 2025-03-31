import { Router } from "express";
import Notification from "../models/Notification.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { formatResponse } from "../utils/index.js";
import User from "../models/User.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 }) // Sort by newest first
            .populate("senderId", "username profilePicture") // Populate sender info
            .populate("postId", "content"); // Populate post content if available

        res.status(200).json(
            formatResponse("Notifications fetched", notifications, null)
        );
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json(
            formatResponse("Failed to fetch notifications", null, error.message)
        );
    }
});

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { userId, type, message, postId } = req.body;

        // Validate required fields
        if (!userId || !type || !message) {
            return res
                .status(400)
                .json(
                    formatResponse(
                        "Missing required fields",
                        null,
                        "MISSING_FIELDS"
                    )
                );
        }

        const newNotification = new Notification({
            userId, // The user receiving the notification
            senderId: req.user.id, // The user who triggered the notification
            type, // e.g., "mention", "like", "comment"
            message, // Custom message
            postId, // Optional: If related to a post
        });

        const savedNotification = await newNotification.save();

        // Emit notification via WebSocket (if you have a real-time system)
        req.app.locals.io.emit(`notification-${userId}`, savedNotification);

        res.status(201).json(
            formatResponse("Notification created", savedNotification, null)
        );
    } catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json(
            formatResponse("Failed to create notification", null, error.message)
        );
    }
});
router.post("/all", authMiddleware, async (req, res) => {
    try {
        // Check if the user is an admin
        if (req.user.role !== "admin") {
            return res
                .status(403)
                .json(formatResponse("Access denied", null, "FORBIDDEN"));
        }

        const { type, message } = req.body;

        if (!type || !message) {
            return res
                .status(400)
                .json(
                    formatResponse(
                        "Missing required fields",
                        null,
                        "MISSING_FIELDS"
                    )
                );
        }

        // Get all users except the admin
        const users = await User.find({ _id: { $ne: req.user.id } }).select(
            "_id"
        );

        if (users.length === 0) {
            return res
                .status(400)
                .json(
                    formatResponse("No users found to notify", null, "NO_USERS")
                );
        }

        // Create notifications for all users
        const notifications = users.map((user) => ({
            userId: user._id,
            senderId: req.user.id, // Admin ID
            type,
            message,
        }));

        const savedNotifications = await Notification.insertMany(notifications);

        // Emit notifications in real-time (if WebSocket is enabled)
        users.forEach((user) => {
            req.app.locals.io.emit(`notification-${user._id}`, {
                message,
                type,
                senderId: req.user.id,
            });
        });

        res.status(201).json(
            formatResponse(
                "Notifications sent to all users",
                savedNotifications,
                null
            )
        );
    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json(
            formatResponse("Failed to send notifications", null, error.message)
        );
    }
});
router.patch("/:id/read", authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res
                .status(404)
                .json(
                    formatResponse("Notification not found", null, "NOT_FOUND")
                );
        }

        res.status(200).json(
            formatResponse("Notification marked as read", notification, null)
        );
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json(
            formatResponse("Failed to update notification", null, error.message)
        );
    }
});

router.patch("/read-all", authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, read: false },
            { $set: { read: true } }
        );

        res.status(200).json(
            formatResponse("All notifications marked as read", null, null)
        );
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json(
            formatResponse(
                "Failed to update notifications",
                null,
                error.message
            )
        );
    }
});

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id,
        });

        if (!notification) {
            return res
                .status(404)
                .json(
                    formatResponse("Notification not found", null, "NOT_FOUND")
                );
        }

        res.status(200).json(
            formatResponse("Notification deleted", null, null)
        );
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json(
            formatResponse("Failed to delete notification", null, error.message)
        );
    }
});

export default router;
