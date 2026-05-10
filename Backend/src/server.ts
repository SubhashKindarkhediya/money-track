import "reflect-metadata";
import app from "./app";
import { connectDB } from "./config/db";
import sequelize from "./config/db";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log("✅ Models synced successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ FAILED TO START SERVER:", error);
    process.exit(1);
  }
};

startServer();
