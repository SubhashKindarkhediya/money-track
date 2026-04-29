import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db";
import User from "./user.model";
import Person from "./person.model";

export type TransactionType = "income" | "expense" | "credit" | "debit";

interface TransactionAttributes {
  id: string;
  uid: string;
  person_id?: string | null;
  type: TransactionType;
  amount: number;
  reason?: string;
  note?: string;
  status: "pending" | "completed";
  date: Date;
}

interface TransactionCreationAttributes extends Optional<
  TransactionAttributes,
  "id" | "date" | "reason" | "note" | "status"
> {}

class Transaction
  extends Model<TransactionAttributes, TransactionCreationAttributes>
  implements TransactionAttributes
{
  public id!: string;
  public uid!: string;
  public person_id!: string | null;
  public type!: TransactionType;
  public amount!: number;
  public reason!: string;
  public note!: string;
  public status!: "pending" | "completed";
  public date!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Transaction.init(
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
    person_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("income", "expense", "credit", "debit"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    reason: {
      type: DataTypes.STRING,
    },
    note: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed"),
      allowNull: false,
      defaultValue: "pending",
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "transactions",
    timestamps: true,
  },
);

export default Transaction;
