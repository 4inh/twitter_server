import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import postRoutes from "./routes/post.js";
import messageRoutes from "./routes/message.js";
import exploreRoutes from "./routes/explore.js";
import notificationsRoutes from "./routes/notification.js";

import "dotenv/config";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });
// Make io accessible in routes via app.locals
app.locals.io = io;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Define routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/explore", exploreRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationsRoutes);

const users = {};
// Handle Socket.io connections
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    socket.on("join", (userId) => {
        socket.join(userId); // Join a room with the user's ID for notifications
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Remove user from users object
        Object.keys(users).forEach((userId) => {
            if (users[userId] === socket.id) {
                delete users[userId];
            }
        });
    });
    socket.on("authenticate", (userId) => {
        users[userId] = socket.id;
        console.log("User authenticated:", userId, socket.id);
    });

    // Handle video call signaling
    socket.on("callUser", ({ to, from, name, offer }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit("incomingCall", { from, name });
            io.to(toSocketId).emit("offer", { offer, from, name });
        }
    });

    socket.on("answerCall", ({ to, from }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit("callAnswered", { from });
        }
    });

    socket.on("answer", ({ to, answer }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit("callAccepted", { answer });
        }
    });

    socket.on("iceCandidate", ({ to, candidate }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit("iceCandidate", { candidate });
        }
    });

    socket.on("endCall", ({ to }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit("callEnded");
        }
    });

    socket.on("rejectCall", ({ to }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit("callRejected");
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
