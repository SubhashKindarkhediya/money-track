import User from "./user.model";
import Person from "./person.model";
import Transaction from "./transaction.model";
import Notification from "./notification.model";
import Group from "./group.model";
import GroupMember from "./group_member.model";

// User → Person
User.hasMany(Person, { foreignKey: "uid" });
Person.belongsTo(User, { foreignKey: "uid" });

// User → Group
User.hasMany(Group, { foreignKey: "uid" });
Group.belongsTo(User, { foreignKey: "uid" });

// Group ↔ Person (Many-to-Many via GroupMember)
Group.belongsToMany(Person, { through: GroupMember, foreignKey: "group_id", as: "members" });
Person.belongsToMany(Group, { through: GroupMember, foreignKey: "person_id", as: "groups" });

// User → Transaction
User.hasMany(Transaction, { foreignKey: "uid" });
Transaction.belongsTo(User, { foreignKey: "uid" });

// Person → Transaction
Person.hasMany(Transaction, { foreignKey: "person_id" });
Transaction.belongsTo(Person, { foreignKey: "person_id" });

// Group → Transaction
Group.hasMany(Transaction, { foreignKey: "group_id", as: "transactions" });
Transaction.belongsTo(Group, { foreignKey: "group_id", as: "group" });

// User → Notification (Recipient)
User.hasMany(Notification, { foreignKey: "recipient_id", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "recipient_id", as: "recipient" });

// User → Notification (Sender)
User.hasMany(Notification, { foreignKey: "sender_id", as: "sentNotifications" });
Notification.belongsTo(User, { foreignKey: "sender_id", as: "sender" });

export { User, Person, Transaction, Notification, Group, GroupMember };
