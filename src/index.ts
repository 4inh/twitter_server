import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/auth";
import postRoutes from "./routes/post";
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
        console.log("Missing MONGODB_URL");
        return;
    }
    console.log("Connect string ", process.env.MONGODB_URL);

    // {
    //     useNewUrlParser: true,
    //     useUnifiedTopology: true,
    // }
    mongoose
        .connect(process.env.MONGODB_URL)
        .then(() => console.log("MongoDB connected"))
        .catch((err) => console.error("MongoDB connection error:", err));
};
connectMongoDB();
// Define routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

// Handle Socket.io connections
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
