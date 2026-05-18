import "reflect-metadata";
import User from "./src/models/user.model";
import sequelize from "./src/config/db";

async function checkUser() {
  try {
    await sequelize.authenticate();
    const user = await User.findOne({ where: { email: 'ravi@yopmail.com' } });
    if (user) {
      console.log("USER_FOUND:", JSON.stringify(user.toJSON(), null, 2));
    } else {
      console.log("USER_NOT_FOUND");
    }
  } catch (error) {
    console.error("DB_ERROR:", error);
  } finally {
    await sequelize.close();
  }
}

checkUser();
