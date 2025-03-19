import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/post.js";
import messageRoutes from "./routes/message.js";
import { v2 as cloudinary } from "cloudinary";

import "dotenv/config";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });

// Make io accessible in routes via app.locals
app.locals.io = io;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
const connectMongoDB = () => {
    if (!process.env.MONGODB_URL) {
        throw new Error("Missing MONGODB_URL");
    }
    mongoose
        .connect(process.env.MONGODB_URL)
        .then(() => console.log("MongoDB connected"))
        .catch((err) => console.error("MongoDB connection error:", err));
};
connectMongoDB();

// Configure Cloudinary
if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    throw new Error(
        "Missing Cloudinary configuration in environment variables"
    );
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);

app.post("/api/upload", async (req, res) => {
    try {
        console.log({ body: req.body });

        const { file } = req.body;
        if (!file) return res.status(400).json({ message: "No file provided" });

        const result = await cloudinary.uploader.upload(file, {
            folder: "uploads",
        });

        res.json({ url: result.secure_url });
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).json({ message: "Upload failed" });
    }
});
// Handle Socket.io connections
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
