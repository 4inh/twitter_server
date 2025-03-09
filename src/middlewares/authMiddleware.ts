import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.header("Authorization");

    if (!token) {
        return res
            .status(401)
            .json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(
            token.replace("Bearer ", ""),
            process.env.JWT_SECRET!
        );
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token." });
    }
};

export default authMiddleware;
