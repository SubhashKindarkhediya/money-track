import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import User from "./user.model";

interface PersonAttributes {
  id: string;
  uid: string;
  name: string;
  phone?: string;
  notes?: string;
  linked_user_id?: string;
}

interface PersonCreationAttributes extends Optional<PersonAttributes, "id"> {}

class Person
  extends Model<PersonAttributes, PersonCreationAttributes>
  implements PersonAttributes
{
  public id!: string;
  public uid!: string;
  public name!: string;
  public phone?: string;
  public notes?: string;
  public linked_user_id?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Person.init(
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
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    linked_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "persons",
    timestamps: true,
  },
);

Person.belongsTo(User, { foreignKey: "linked_user_id", as: "linkedUser" });

export default Person;
