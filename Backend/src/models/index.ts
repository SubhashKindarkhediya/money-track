import User from "./user.model";
import Person from "./person.model";
import Transaction from "./transaction.model";

// User → Person
User.hasMany(Person, { foreignKey: "uid" });
Person.belongsTo(User, { foreignKey: "uid" });

// User → Transaction
User.hasMany(Transaction, { foreignKey: "uid" });
Transaction.belongsTo(User, { foreignKey: "uid" });

// Person → Transaction
Person.hasMany(Transaction, { foreignKey: "person_id" });
Transaction.belongsTo(Person, { foreignKey: "person_id" });

export { User, Person, Transaction };
