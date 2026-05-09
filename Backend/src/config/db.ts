import { Sequelize } from "sequelize";
import { env } from "./env";

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "postgres",

  logging: env.NODE_ENV === "development" ? console.log : false,

  dialectOptions:
    env.NODE_ENV === "production"
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},

  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

  define: {
    timestamps: true,
    underscored: true, // snake_case columns
  },
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
