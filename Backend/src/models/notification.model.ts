import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import User from "./user.model";

interface NotificationAttributes {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: "request" | "transaction" | "system" | "settle_request" | "group_invite" | "group_joined";
  status: "pending" | "read" | "accepted" | "rejected";
  data: any; // Store extra info like person name, etc.
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, "id"> {}

class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  public id!: string;
  public recipient_id!: string;
  public sender_id!: string;
  public type!: "request" | "transaction" | "system" | "settle_request" | "group_invite" | "group_joined";
  public status!: "pending" | "read" | "accepted" | "rejected";
  public data!: any;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recipient_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending",
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "notifications",
    timestamps: true,
  },
);

export default Notification;
