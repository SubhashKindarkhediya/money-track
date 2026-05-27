const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "subhash1598",
  database: "postgres", // Connect to default DB first
});

async function main() {
  try {
    await client.connect();
    const dbName = process.env.DB_NAME || "finance_app";
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname='finance_app'`);
    if (res.rowCount === 0) {
      console.log(`Database '${dbName}' does not exist. Creating...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database '${dbName}' created successfully!`);
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }
  } catch (err) {
    console.error("Error creating database:", err);
  } finally {
    await client.end();
  }
}

main();
