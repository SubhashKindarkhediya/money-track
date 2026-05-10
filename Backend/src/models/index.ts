import User from "./user.model";
import Person from "./person.model";
import Transaction from "./transaction.model";
import Notification from "./notification.model";

// User → Person
User.hasMany(Person, { foreignKey: "uid" });
Person.belongsTo(User, { foreignKey: "uid" });

// User → Transaction
User.hasMany(Transaction, { foreignKey: "uid" });
Transaction.belongsTo(User, { foreignKey: "uid" });

// Person → Transaction
Person.hasMany(Transaction, { foreignKey: "person_id" });
Transaction.belongsTo(Person, { foreignKey: "person_id" });

// User → Notification (Recipient)
User.hasMany(Notification, { foreignKey: "recipient_id", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "recipient_id", as: "recipient" });

// User → Notification (Sender)
User.hasMany(Notification, { foreignKey: "sender_id", as: "sentNotifications" });
Notification.belongsTo(User, { foreignKey: "sender_id", as: "sender" });

export { User, Person, Transaction, Notification };
