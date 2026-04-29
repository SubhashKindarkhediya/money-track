import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. Get token from header
  // Header format: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key") as any;

    // 3. Add user info to request object
    (req as any).user = decoded;

    // 4. Move to next function (Controller)
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
