import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone_number?: string;
  gender?: string;
  address?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  id_card_no?: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, "id"> { }

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  public id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public confirmPassword!: string;
  public phone_number?: string;
  public gender?: string;
  public address?: string;
  public first_name?: string;
  public last_name?: string;
  public dob?: string;
  public id_card_no?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    confirmPassword: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dob: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    id_card_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
  },
);

export default User;
