import { singleton } from "tsyringe";
import Transaction, { TransactionType } from "../models/transaction.model";
import Person from "../models/person.model";

@singleton()
export class TransactionsService {
  /**
   * Add a new transaction
   */
  async createTransaction(data: {
    uid: string;
    person_id?: string | null;
    type: TransactionType;
    amount: number;
    reason?: string;
    note?: string;
    status?: "pending" | "completed";
    date?: Date;
  }) {
    return await Transaction.create(data);
  }

  /**
   * Get all transactions for a user
   */
  async getTransactionsByUid(uid: string) {
    return await Transaction.findAll({
      where: { uid },
      order: [["date", "DESC"]],
      include: [
        {
          model: Person,
          attributes: ["id", "name", "phone"],
        },
      ],
    });
  }

  /**
   * Get transactions for a specific person
   */
  async getTransactionsByPerson(person_id: string, uid: string) {
    return await Transaction.findAll({
      where: { person_id, uid },
      order: [["date", "DESC"]],
      include: [
        {
          model: Person,
          attributes: ["id", "name", "phone"],
        },
      ],
    });
  }

  /**
   * Get a single transaction by ID
   */
  async getTransactionById(id: string, uid: string) {
    return await Transaction.findOne({
      where: { id, uid },
    });
  }

  /**
   * Update a transaction
   */
  async updateTransaction(
    id: string,
    data: { amount?: number; reason?: string; note?: string; date?: Date; status?: "pending" | "completed" },
    uid: string
  ) {
    const transaction = await this.getTransactionById(id, uid);
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    return await transaction.update(data);
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string, uid: string) {
    const transaction = await this.getTransactionById(id, uid);
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    await transaction.destroy();
    return true;
  }
}
