import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import User from "./user.model";

interface GroupAttributes {
  id: string;
  uid: string;
  name: string;
  description?: string;
  type?: string;
}

interface GroupCreationAttributes extends Optional<GroupAttributes, "id"> {}

class Group extends Model<GroupAttributes, GroupCreationAttributes> implements GroupAttributes {
  public id!: string;
  public uid!: string;
  public name!: string;
  public description?: string;
  public type?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Group.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    uid: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "groups",
    timestamps: true,
  }
);

export default Group;
