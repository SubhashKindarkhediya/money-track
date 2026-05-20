import { singleton } from "tsyringe";
import { Op } from "sequelize";
import Transaction, { TransactionType } from "../models/transaction.model";
import Person from "../models/person.model";
import User from "../models/user.model";
import { NotificationService } from "./notification.service";

@singleton()
export class TransactionsService {
  constructor(private notificationService: NotificationService) {}

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
  }, isMirror: boolean = false) {
    const transaction = await Transaction.create(data);

    // Trigger mirroring and notification if linked user exists and it's not already a mirror
    if (!isMirror && data.person_id && (data.type === 'credit' || data.type === 'debit')) {
      const person = await Person.findByPk(data.person_id);
      
      if (person && person.linked_user_id) {
        // Find if there is an accepted connection
        const { default: Notification } = await import("../models/notification.model");
        const connection = await Notification.findOne({
          where: {
            type: 'request',
            status: 'accepted',
            [Op.or]: [
              { sender_id: data.uid, recipient_id: person.linked_user_id },
              { sender_id: person.linked_user_id, recipient_id: data.uid }
            ]
          }
        });

        if (connection) {
          const currentUser = await User.findByPk(data.uid);
          
          // Find the mirror person (Current User in the Linked User's list)
          const mirrorPerson = await Person.findOne({
            where: {
              uid: person.linked_user_id,
              linked_user_id: data.uid
            }
          });

          if (mirrorPerson) {
            // Create Mirror Transaction
            const mirrorType: TransactionType = data.type === 'credit' ? 'debit' : 'credit';
            
            await Transaction.create({
              uid: person.linked_user_id,
              person_id: mirrorPerson.id,
              type: mirrorType,
              amount: data.amount,
              reason: data.reason,
              note: data.note,
              status: data.status || 'pending',
              date: data.date || new Date(),
            });

            // Notify the recipient
            await this.notificationService.createNotification({
              recipient_id: person.linked_user_id,
              sender_id: data.uid,
              type: "transaction",
              data: {
                message: `${currentUser?.name} added a transaction of ₹${data.amount} (${data.type === 'credit' ? 'Gave to you' : 'Got from you'}). This has been automatically added to your history.`,
                amount: data.amount,
                type: mirrorType,
                senderName: currentUser?.name,
                reason: data.reason,
                autoAdded: true
              },
            });
          }
        }
      }
    }

    return transaction;
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
   * Settle a transaction (supports partial and full settlement)
   */
  async settleTransaction(
    id: string,
    uid: string,
    settleAmount: number,
    date?: Date,
    note?: string
  ) {
    const transaction = await this.getTransactionById(id, uid);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status === "completed") {
      throw new Error("Transaction is already completed");
    }

    const currentAmount = Number(transaction.amount);

    if (settleAmount >= currentAmount) {
      // Full settlement
      return await transaction.update({ status: "completed" });
    } else {
      // Partial settlement
      const remainingAmount = currentAmount - settleAmount;

      // 1. Update original transaction's amount to the remaining pending amount
      await transaction.update({ amount: remainingAmount });

      // 2. Create a new transaction representing the completed partial payment
      const settledTx = await this.createTransaction({
        uid: transaction.uid,
        person_id: transaction.person_id,
        type: transaction.type,
        amount: settleAmount,
        reason: `[Paid Part] ${transaction.reason || "Payment"}`,
        note: `Settled ${settleAmount} from original pending of ${currentAmount}. ${note || ""}`,
        status: "completed",
        date: date || new Date()
      });

      return settledTx;
    }
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
