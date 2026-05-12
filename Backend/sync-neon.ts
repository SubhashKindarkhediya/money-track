/**
 * One-time script to create all tables in NeonDB.
 * Run with: npx ts-node sync-neon.ts
 */
import "reflect-metadata";
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env file!");
  console.error("👉 Add your NeonDB connection string to Backend/.env");
  process.exit(1);
}

console.log("🔌 Connecting to NeonDB...");

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

// Import all models (this registers them with Sequelize)
import "./src/models/index";

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to NeonDB successfully!");

    console.log("🔄 Syncing models (force: false, alter: true)...");
    await sequelize.sync({ alter: true });

    console.log("✅ All tables created/updated in NeonDB!");
    console.log("\n📋 Tables synced:");
    console.log("  - users");
    console.log("  - persons");
    console.log("  - transactions");
    console.log("  - notifications");

    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
};

run();
