import { Sequelize } from "sequelize";
import { env } from "./env";

const sslOptions =
  env.NODE_ENV === "production"
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {};

// Use DATABASE_URL if available (Neon.tech), else use individual params
const sequelize = env.DATABASE_URL
  ? new Sequelize(env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: sslOptions,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      define: { timestamps: true, underscored: true },
    })
  : new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
      host: env.DB_HOST,
      port: env.DB_PORT,
      dialect: "postgres",
      logging: env.NODE_ENV === "development" ? console.log : false,
      dialectOptions: sslOptions,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      define: { timestamps: true, underscored: true },
    });

// DB connection check
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

export default sequelize;
