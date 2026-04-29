import "reflect-metadata";
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index";
import "./di/container";
import "./models"; // Ensures all Sequelize associations are registered

const app: Application = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

// All API routes
app.use("/api/v1", routes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Server is running 🚀" });
});

export default app;
