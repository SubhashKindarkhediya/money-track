import "reflect-metadata";
import app from "./app";
import { connectDB } from "./config/db";
import sequelize from "./config/db";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Sync models
  await sequelize.sync({ alter: true });

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http:// localhost:${PORT}`);
  });
};

startServer();
