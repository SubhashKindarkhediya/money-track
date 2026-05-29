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
   * If the person is a linked/connected user, automatically mirror the transaction
   * on their side and send them a notification.
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
            const mirrorType: TransactionType = data.type === 'credit' ? 'debit' : 'credit';

            // Create mirror transaction
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

            // Notify the linked user
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
   * Sync completion to the mirror transaction of a linked/connected user.
   * Called internally after a transaction is marked as completed.
   *
   * - Finds the corresponding mirror transaction on the other user's side
   * - Marks it as completed too
   * - Sends a notification to the other user
   */
  private async syncMirrorCompletion(transaction: Transaction, uid: string, note?: string) {
    if (!transaction.person_id) return;

    const person = await Person.findByPk(transaction.person_id);
    if (!person || !person.linked_user_id) return;

    // Verify users are still connected
    const { default: Notification } = await import("../models/notification.model");
    const connection = await Notification.findOne({
      where: {
        type: 'request',
        status: 'accepted',
        [Op.or]: [
          { sender_id: uid, recipient_id: person.linked_user_id },
          { sender_id: person.linked_user_id, recipient_id: uid }
        ]
      }
    });
    if (!connection) return;

    // Find mirror person (current user in linked user's contact list)
    const mirrorPerson = await Person.findOne({
      where: {
        uid: person.linked_user_id,
        linked_user_id: uid
      }
    });
    if (!mirrorPerson) return;

    // Find the best-matching pending mirror transaction (opposite type, same amount)
    const mirrorType: TransactionType = transaction.type === 'credit' ? 'debit' : 'credit';
    const mirrorTx = await Transaction.findOne({
      where: {
        uid: person.linked_user_id,
        person_id: mirrorPerson.id,
        type: mirrorType,
        status: 'pending',
        amount: transaction.amount,
      },
      order: [['date', 'DESC']]
    });

    if (mirrorTx) {
      await mirrorTx.update({ status: 'completed' });
    }

    // Notify the linked user about the completion
    const completingUser = await User.findByPk(uid);
    await this.notificationService.createNotification({
      recipient_id: person.linked_user_id,
      sender_id: uid,
      type: "transaction",
      data: {
        message: `${completingUser?.name} has marked a transaction of ₹${transaction.amount} as completed.${note ? ` Note: ${note}` : ''}`,
        amount: transaction.amount,
        type: mirrorType,
        senderName: completingUser?.name,
        subType: 'completed',
        autoAdded: true
      },
    });
  }

  /**
   * Update a transaction.
   * If status changes to "completed", also syncs mirror completion on linked user's side.
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

    const wasCompleted = data.status === "completed" && transaction.status !== "completed";
    const updated = await transaction.update(data);

    // If just marked as completed → sync mirror on other user's side
    if (wasCompleted) {
      await this.syncMirrorCompletion(updated, uid, data.note);
    }

    return updated;
  }

  /**
   * Settle a transaction (supports partial and full settlement).
   * On full settlement: marks mirror as completed and notifies linked user.
   * On partial settlement: mirrors the partial settled amount and notifies linked user.
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
      // Full settlement — mark complete and sync mirror
      const updated = await transaction.update({ status: "completed" });
      await this.syncMirrorCompletion(updated, uid, note);
      return updated;
    } else {
      // Partial settlement
      const remainingAmount = currentAmount - settleAmount;

      // 1. Update original transaction amount to remaining pending
      await transaction.update({ amount: remainingAmount });

      // 2. Create a new completed transaction for the settled portion
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

      // 3. Sync partial completion to mirror and notify linked user
      await this.syncMirrorCompletion(settledTx, uid, note);

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
