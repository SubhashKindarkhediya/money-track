import { singleton } from "tsyringe";
import { Op } from "sequelize";
import Transaction, { TransactionType } from "../models/transaction.model";
import Person from "../models/person.model";
import User from "../models/user.model";
import { NotificationService } from "./notification.service";

@singleton()
export class TransactionsService {
  constructor(private notificationService: NotificationService) { }

  /**
   * Add a new transaction
   * If the person is a linked/connected user, automatically mirror the transaction
   * on their side and send them a notification.
   */
  async createTransaction(data: {
    uid: string;
    person_id?: string | null;
    group_id?: string | null;
    type: TransactionType;
    amount: number;
    category?: string;
    reason?: string;
    note?: string;
    status?: "pending" | "completed";
    date?: Date;
    created_by?: string | null;
  }, isMirror: boolean = false) {
    // If created_by is not provided, default to the uid of the person initiating the creation
    if (!data.created_by) {
      data.created_by = data.uid;
    }
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
              created_by: data.created_by || data.uid,
            });

            // Notify the linked user
            await this.notificationService.createNotification({
              recipient_id: person.linked_user_id,
              sender_id: data.uid,
              type: "transaction",
              data: {
                message: `${currentUser?.name} added a transaction of ₹${data.amount} (${data.type === 'credit' ? 'Got from you' : 'Gave to you'}). This has been automatically added to your history.`,
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
    // If it's a group transaction, notify other joined members (and creator)
    if (data.group_id) {
      const { default: Group } = await import("../models/group.model");
      const { default: GroupMember } = await import("../models/group_member.model");
      
      const group = await Group.findByPk(data.group_id);
      if (group) {
        const currentUser = await User.findByPk(data.uid);
        
        // Find all members who have joined
        const members = await GroupMember.findAll({
          where: { group_id: data.group_id, status: 'joined' }
        });

        // Collect all target UIDs to notify (excluding the one who created it)
        const targetUids = new Set<string>();
        
        // Add creator if they didn't create the transaction
        if (group.uid !== data.uid) {
          targetUids.add(group.uid);
        }

        // Add all joined members
        for (const member of members) {
          const person = await Person.findByPk(member.person_id);
          if (person && person.linked_user_id && person.linked_user_id !== data.uid) {
            targetUids.add(person.linked_user_id);
          }
        }

        // Send notifications
        for (const targetUid of targetUids) {
          await this.notificationService.createNotification({
            recipient_id: targetUid,
            sender_id: data.uid,
            type: "system",
            data: {
              message: `${currentUser?.name || 'Someone'} added a new transaction of ₹${data.amount} in group: ${group.name}`,
              subType: "group_transaction",
              amount: data.amount,
              type: data.type,
              personName: currentUser?.name || 'A user',
              group_id: data.group_id,
            },
          });
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
      where: { person_id, uid, group_id: null },
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
   * Get transactions for a specific group
   */
  async getTransactionsByGroup(group_id: string, uid: string) {
    const { default: Group } = await import("../models/group.model");
    const { default: GroupMember } = await import("../models/group_member.model");
    const { default: Person } = await import("../models/person.model");
    
    let hasAccess = false;
    const group = await Group.findByPk(group_id);
    if (group && group.uid === uid) {
      hasAccess = true;
    } else {
      const userPersons = await Person.findAll({ where: { linked_user_id: uid } });
      const userPersonIds = userPersons.map(p => p.id);
      const member = await GroupMember.findOne({ where: { group_id, person_id: userPersonIds, status: 'joined' } });
      if (member) hasAccess = true;
    }

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    return await Transaction.findAll({
      where: { group_id },
      order: [["date", "DESC"]],
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
  private async syncMirrorCompletion(transaction: Transaction, uid: string, note?: string, silent: boolean = false) {
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
        status: {
          [Op.in]: ['pending', 'settle_requested']
        },
        amount: transaction.amount,
      },
      order: [['date', 'DESC']]
    });

    if (mirrorTx) {
      await mirrorTx.update({ status: 'completed' });
    }

    // Notify the linked user about the completion
    if (!silent) {
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
  }

  async syncMirrorStatus(transaction: Transaction, uid: string, newStatus: "pending" | "settle_requested") {
    if (!transaction.person_id) return;
    const person = await Person.findByPk(transaction.person_id);
    if (!person || !person.linked_user_id) return;

    const mirrorPerson = await Person.findOne({
      where: { uid: person.linked_user_id, linked_user_id: uid }
    });
    if (!mirrorPerson) return;

    const mirrorType: TransactionType = transaction.type === 'credit' ? 'debit' : 'credit';
    const currentStatus = newStatus === 'settle_requested' ? 'pending' : 'settle_requested';
    const mirrorTx = await Transaction.findOne({
      where: {
        uid: person.linked_user_id,
        person_id: mirrorPerson.id,
        type: mirrorType,
        status: currentStatus,
        amount: transaction.amount,
      },
      order: [['date', 'DESC']]
    });

    if (mirrorTx) {
      await mirrorTx.update({ status: newStatus as any });
    }
  }

  /**
   * Update a transaction.
   * If status changes to "completed", also syncs mirror completion on linked user's side.
   */
  async updateTransaction(
    id: string,
    data: { amount?: number; category?: string; reason?: string; note?: string; date?: Date; status?: "pending" | "completed"; type?: TransactionType },
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
    note?: string,
    bypassApproval: boolean = false
  ) {
    const transaction = await this.getTransactionById(id, uid);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status === "completed") {
      throw new Error("Transaction is already completed");
    }

    // Verify connection first
    let isConnected = false;
    let linkedUserId: string | null = null;
    if (transaction.person_id) {
      const { default: Person } = await import("../models/person.model");
      const person = await Person.findByPk(transaction.person_id);
      if (person && person.linked_user_id) {
        const { default: Notification } = await import("../models/notification.model");
        const connection = await Notification.findOne({
          where: { type: 'request', status: 'accepted', [Op.or]: [{ sender_id: uid, recipient_id: person.linked_user_id }, { sender_id: person.linked_user_id, recipient_id: uid }] }
        });
        if (connection) { isConnected = true; linkedUserId = person.linked_user_id; }
      }
    }

    if (isConnected && linkedUserId && !bypassApproval) {
      await transaction.update({ status: "settle_requested" as any });
      await this.syncMirrorStatus(transaction, uid, "settle_requested");
      const currentUser = await User.findByPk(uid);
      await this.notificationService.createNotification({
        recipient_id: linkedUserId,
        sender_id: uid,
        type: "settle_request",
        data: { subType: "single", txId: id, settleAmount, date: date || new Date(), note, message: `${currentUser?.name} wants to settle ₹${settleAmount} for a pending transaction.` }
      });
      return { message: "Settlement request sent for approval.", isRequested: true, transaction };
    }

    const currentAmount = Number(transaction.amount);

    if (settleAmount >= currentAmount) {
      // Full settlement — mark complete and sync mirror
      const updated = await transaction.update({ status: "completed" });
      await this.syncMirrorCompletion(updated, uid, note, bypassApproval);
      return updated;
    } else {
      // Partial settlement
      const remainingAmount = currentAmount - settleAmount;

      // 1. Update original transaction amount to remaining pending, and revert status to pending
      await transaction.update({ amount: remainingAmount, status: "pending" });

      // 1.5 Update mirror original transaction
      if (isConnected && linkedUserId) {
        const { default: Person } = await import("../models/person.model");
        const mirrorPerson = await Person.findOne({ where: { uid: linkedUserId, linked_user_id: uid } });
        if (mirrorPerson) {
          const mirrorType = transaction.type === 'credit' ? 'debit' : 'credit';
          const mirrorTxOriginal = await Transaction.findOne({
            where: { uid: linkedUserId, person_id: mirrorPerson.id, type: mirrorType, status: "settle_requested", amount: currentAmount }
          });
          if (mirrorTxOriginal) {
            await mirrorTxOriginal.update({ amount: remainingAmount, status: "pending" });
          }
        }
      }

      // 2. Create a new completed transaction for the settled portion
      const settledTx = await this.createTransaction({
        uid: transaction.uid,
        person_id: transaction.person_id,
        type: transaction.type,
        amount: settleAmount,
        reason: `[Paid Part] ${transaction.reason || "Payment"}`,
        note: `Settled ${settleAmount} from original pending of ${currentAmount}. ${note || ""}`,
        status: "completed",
        date: date || new Date(),
        created_by: uid
      }, bypassApproval);

      // 3. Sync partial completion to mirror manually if connected
      if (isConnected && linkedUserId) {
        const { default: Person } = await import("../models/person.model");
        const mirrorPerson = await Person.findOne({ where: { uid: linkedUserId, linked_user_id: uid } });
        if (mirrorPerson) {
          await Transaction.create({
            uid: linkedUserId,
            person_id: mirrorPerson.id,
            type: settledTx.type === 'credit' ? 'debit' : 'credit',
            amount: settleAmount,
            reason: settledTx.reason,
            note: settledTx.note,
            status: "completed",
            date: settledTx.date || new Date(),
            created_by: uid
          });
        }
      }

      return settledTx;
    }
  }

  /**
   * Settle a person's net balance (Option 1 - Splitwise style).
   * Adds a new offsetting transaction. If net balance becomes 0, marks all pending as completed.
   */
  async settlePersonNetBalance(
    personId: string,
    uid: string,
    settleAmount: number,
    date?: Date,
    note?: string,
    bypassApproval: boolean = false
  ) {
    const { default: Transaction } = await import("../models/transaction.model");

    // 1. Get all pending transactions for this person
    const pendingTxs = await Transaction.findAll({
      where: { uid, person_id: personId, status: bypassApproval ? "settle_requested" : "pending" }
    });

    if (pendingTxs.length === 0) {
      throw new Error("No pending transactions to settle.");
    }

    // 2. Calculate net balance
    let credit = 0;
    let debit = 0;
    pendingTxs.forEach((t: any) => {
      if (t.type === 'credit') credit += Number(t.amount);
      if (t.type === 'debit') debit += Number(t.amount);
    });

    const netBalance = credit - debit;
    if (netBalance === 0) {
      throw new Error("Net balance is already 0.");
    }

    if (settleAmount > Math.abs(netBalance)) {
      throw new Error(`Settle amount cannot exceed the pending balance of ${Math.abs(netBalance)}.`);
    }

    // Verify connection first
    let isConnected = false;
    let linkedUserId: string | null = null;
    const { default: Person } = await import("../models/person.model");
    const person = await Person.findByPk(personId);
    if (person && person.linked_user_id) {
      const { default: Notification } = await import("../models/notification.model");
      const connection = await Notification.findOne({
        where: { type: 'request', status: 'accepted', [Op.or]: [{ sender_id: uid, recipient_id: person.linked_user_id }, { sender_id: person.linked_user_id, recipient_id: uid }] }
      });
      if (connection) { isConnected = true; linkedUserId = person.linked_user_id; }
    }

    if (isConnected && linkedUserId && !bypassApproval) {
      // Mark all as settle_requested
      for (const tx of pendingTxs) {
        await (tx as any).update({ status: "settle_requested" as any });
        await this.syncMirrorStatus(tx as any, uid, "settle_requested");
      }
      const currentUser = await User.findByPk(uid);
      await this.notificationService.createNotification({
        recipient_id: linkedUserId,
        sender_id: uid,
        type: "settle_request",
        data: { subType: "net_balance", personId, settleAmount, date: date || new Date(), note, message: `${currentUser?.name} wants to settle ₹${settleAmount} towards your net balance.` }
      });
      return { message: "Settlement request sent for approval.", isRequested: true };
    }

    // 3. Create the offsetting transaction
    // If netBalance > 0 (You'll Get / Credit), we need to create a 'debit' to offset it.
    // If netBalance < 0 (You Owe / Debit), we need to create a 'credit' to offset it.
    const typeToCreate = netBalance > 0 ? 'debit' : 'credit';

    const newTx = await this.createTransaction({
      uid,
      person_id: personId,
      type: typeToCreate,
      amount: settleAmount,
      reason: "Settlement",
      note: note || `Settled ${settleAmount} towards balance`,
      status: "pending", // Initially pending
      date: date || new Date(),
      created_by: uid
    }, bypassApproval);

    // 4. Recalculate net balance with the new transaction included
    if (typeToCreate === 'credit') credit += settleAmount;
    if (typeToCreate === 'debit') debit += settleAmount;

    const newNetBalance = credit - debit;

    // 5. If new net balance is 0 (exactly settled), mark ALL as completed
    if (Math.abs(newNetBalance) < 0.01) { // Floating point safe check
      const allTxs = [...pendingTxs, newTx];
      for (const tx of allTxs) {
        const updated = await (tx as any).update({ status: "completed" });
        // Attempt to sync mirror for each (in background to avoid slow response)
        this.syncMirrorCompletion(updated, uid, "Settled via Net Balance", bypassApproval).catch(e => console.error(e));
      }
      return { message: "Full settlement successful. All transactions marked as completed.", newTx, isFullySettled: true };
    } else {
      // Partial Net Balance Settlement
      // Manually create the offsetting transaction for the mirror user
      if (isConnected && linkedUserId) {
        const mirrorPerson = await Person.findOne({ where: { uid: linkedUserId, linked_user_id: uid } });
        if (mirrorPerson) {
          await Transaction.create({
            uid: linkedUserId,
            person_id: mirrorPerson.id,
            type: newTx.type === 'credit' ? 'debit' : 'credit',
            amount: settleAmount,
            reason: newTx.reason,
            note: newTx.note,
            status: "pending",
            date: newTx.date || new Date(),
            created_by: uid
          });
        }
      }

      // Important: Revert the original pending transactions back to "pending" from "settle_requested"
      for (const tx of pendingTxs) {
        await (tx as any).update({ status: "pending" as any });
        if (isConnected && linkedUserId) {
          await this.syncMirrorStatus(tx as any, uid, "pending");
        }
      }

      return { message: "Partial settlement successful. Balance updated.", newTx, isFullySettled: false };
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

    // Attempt to delete mirror transaction if connected
    if (transaction.person_id) {
      const person = await Person.findByPk(transaction.person_id);
      if (person && person.linked_user_id) {
        const mirrorPerson = await Person.findOne({
          where: {
            uid: person.linked_user_id,
            linked_user_id: uid
          }
        });

        if (mirrorPerson) {
          const mirrorType: TransactionType = transaction.type === 'credit' ? 'debit' : 'credit';
          const mirrorTx = await Transaction.findOne({
            where: {
              uid: person.linked_user_id,
              person_id: mirrorPerson.id,
              type: mirrorType,
              amount: transaction.amount,
              status: transaction.status
            },
            order: [['date', 'DESC']]
          });

          if (mirrorTx) {
            await mirrorTx.destroy();
            // Notify the linked user about the deletion
            const currentUser = await User.findByPk(uid);
            await this.notificationService.createNotification({
              recipient_id: person.linked_user_id,
              sender_id: uid,
              type: "system",
              data: {
                message: `${currentUser?.name} has deleted a transaction of ₹${transaction.amount} (${transaction.reason || 'No reason'}). It has also been removed from your history to keep balances synced.`,
                subType: "transaction_deleted",
              },
            });
          }
        }
      }
    }

    // If it's a group transaction, notify other joined members (and creator)
    if (transaction.group_id) {
      const { default: Group } = await import("../models/group.model");
      const { default: GroupMember } = await import("../models/group_member.model");
      
      const group = await Group.findByPk(transaction.group_id);
      if (group) {
        const currentUser = await User.findByPk(uid);
        
        const members = await GroupMember.findAll({
          where: { group_id: transaction.group_id, status: 'joined' }
        });

        const targetUids = new Set<string>();
        
        if (group.uid !== uid) {
          targetUids.add(group.uid);
        }

        for (const member of members) {
          const person = await Person.findByPk(member.person_id);
          if (person && person.linked_user_id && person.linked_user_id !== uid) {
            targetUids.add(person.linked_user_id);
          }
        }

        for (const targetUid of targetUids) {
          await this.notificationService.createNotification({
            recipient_id: targetUid,
            sender_id: uid,
            type: "system",
            data: {
              message: `${currentUser?.name || 'Someone'} deleted a transaction of ₹${transaction.amount} in group: ${group.name}`,
              subType: "group_transaction_deleted",
              amount: transaction.amount,
              group_id: transaction.group_id,
            },
          });
        }
      }
    }

    await transaction.destroy();
    return true;
  }

  /**
   * Sync pending transactions between two users when they connect.
   */
  async syncOldTransactionsOnConnect(
    userAId: string,
    userBId: string,
    personAInBId: string,
    personBInAId: string
  ) {
    // Fetch all pending transactions created by User A for Person B
    const pendingTxsByA = await Transaction.findAll({
      where: { uid: userAId, person_id: personBInAId, status: "pending" }
    });

    // Fetch all pending transactions created by User B for Person A
    const pendingTxsByB = await Transaction.findAll({
      where: { uid: userBId, person_id: personAInBId, status: "pending" }
    });

    let syncCountForB = 0;
    // Mirror A's transactions to B
    for (const tx of pendingTxsByA) {
      if (tx.type === 'credit' || tx.type === 'debit') {
        const mirrorType: TransactionType = tx.type === 'credit' ? 'debit' : 'credit';
        await Transaction.create({
          uid: userBId,
          person_id: personAInBId,
          type: mirrorType,
          amount: tx.amount,
          reason: tx.reason,
          note: tx.note ? `${tx.note} (Old Transaction Auto-Added)` : "Old Transaction Auto-Added",
          status: tx.status,
          date: tx.date || new Date(),
          created_by: tx.created_by || userAId,
        });
        syncCountForB++;
      }
    }

    let syncCountForA = 0;
    // Mirror B's transactions to A
    for (const tx of pendingTxsByB) {
      if (tx.type === 'credit' || tx.type === 'debit') {
        const mirrorType: TransactionType = tx.type === 'credit' ? 'debit' : 'credit';
        await Transaction.create({
          uid: userAId,
          person_id: personBInAId,
          type: mirrorType,
          amount: tx.amount,
          reason: tx.reason,
          note: tx.note ? `${tx.note} (Old Transaction Auto-Added)` : "Old Transaction Auto-Added",
          status: tx.status,
          date: tx.date || new Date(),
          created_by: tx.created_by || userBId,
        });
        syncCountForA++;
      }
    }

    // Notify User B if A had transactions
    if (syncCountForB > 0) {
      const userA = await User.findByPk(userAId);
      await this.notificationService.createNotification({
        recipient_id: userBId,
        sender_id: userAId,
        type: "system",
        data: {
          message: `${userA?.name} and you are now connected. Their previously recorded pending transactions with you have been added to your history.`,
          subType: "old_transactions_synced",
          personId: personAInBId, // This allows frontend to route directly to the person's page
        },
      });
    }

    // Notify User A if B had transactions
    if (syncCountForA > 0) {
      const userB = await User.findByPk(userBId);
      await this.notificationService.createNotification({
        recipient_id: userAId,
        sender_id: userBId,
        type: "system",
        data: {
          message: `${userB?.name} and you are now connected. Their previously recorded pending transactions with you have been added to your history.`,
          subType: "old_transactions_synced",
          personId: personBInAId, // This allows frontend to route directly to the person's page
        },
      });
    }
  }
}
