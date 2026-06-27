import { singleton } from "tsyringe";
import { Op } from "sequelize";
import Notification from "../models/notification.model";
import User from "../models/user.model";

@singleton()
export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(data: {
    recipient_id: string;
    sender_id: string;
    type: "request" | "transaction" | "system" | "settle_request";
    data: any;
  }) {
    return await Notification.create({
      ...data,
      status: "pending",
    });
  }

  /**
   * Get all notifications for a user
   */
  async getNotificationsByUserId(userId: string) {
    const notifications = await Notification.findAll({
      where: {
        [Op.or]: [
          { recipient_id: userId },
          { sender_id: userId }
        ]
      },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "name", "email", "phone_number"],
        },
      ],
    });

    const { default: Transaction } = await import("../models/transaction.model");

    return await Promise.all(notifications.map(async (n: any) => {
      const notifData = n.get({ plain: true });
      if (notifData.data?.subType === "old_transactions_synced" && notifData.data.personId) {
        const pendingCount = await Transaction.count({
          where: {
            uid: userId,
            person_id: notifData.data.personId,
            status: "pending"
          }
        });
        notifData.data.hasPendingOldTxs = pendingCount > 0;
      }
      return notifData;
    }));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, recipient_id: string) {
    const notification = await Notification.findOne({
      where: { id, recipient_id },
    });
    if (!notification) {
      throw new Error("Notification not found");
    }
    if (notification.status === "accepted" || notification.status === "rejected") {
      return notification;
    }
    return await notification.update({ status: "read" });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(recipient_id: string, tab: string) {
    const notifications = await Notification.findAll({
      where: { recipient_id, status: "pending" }
    });

    for (const n of notifications) {
      const isRequestsTab = (n.type === 'request' || n.type === 'group_invite' || n.type === 'group_joined');
      const isActivityTab = (n.type === 'transaction' || n.type === 'system' || n.type === 'settle_request');

      if ((tab === 'requests' && isRequestsTab) || (tab === 'activity' && isActivityTab)) {
        const isInteractive = (n.type === 'request' && n.data?.subType !== 'response') || n.type === 'group_invite' || n.type === 'settle_request';
        
        if (!isInteractive) {
          await n.update({ status: 'read' });
        }
      }
    }
    return { success: true };
  }

  /**
   * Clear all notifications
   */
  async clearAll(recipient_id: string, tab: string) {
    const notifications = await Notification.findAll({
      where: { recipient_id, status: { [Op.ne]: "pending" } }
    });

    for (const n of notifications) {
      const isRequestsTab = (n.type === 'request' || n.type === 'group_invite' || n.type === 'group_joined');
      const isActivityTab = (n.type === 'transaction' || n.type === 'system' || n.type === 'settle_request');

      if ((tab === 'requests' && isRequestsTab) || (tab === 'activity' && isActivityTab)) {
        await n.destroy();
      }
    }
    return { success: true };
  }

  /**
   * Update notification status (e.g. accepted/rejected)
   */
  async updateStatus(id: string, recipient_id: string, status: "accepted" | "rejected") {
    const notification = await Notification.findOne({
      where: { id, recipient_id },
    });
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (status === "accepted" && notification.type === "request") {
      const { default: Person } = await import("../models/person.model");

      const sender = await User.findByPk(notification.sender_id);
      const recipient = await User.findByPk(notification.recipient_id);

      if (sender && recipient) {
        // 1. Ensure Sender is in Recipient's list
        let senderInRecipientList = await Person.findOne({
          where: {
            uid: notification.recipient_id,
            linked_user_id: notification.sender_id
          }
        });

        if (!senderInRecipientList) {
          senderInRecipientList = await Person.create({
            uid: notification.recipient_id,
            name: sender.name,
            phone: sender.phone_number,
            linked_user_id: notification.sender_id
          });
        }

        // 2. Ensure Recipient is in Sender's list
        let recipientInSenderList = await Person.findOne({
          where: {
            uid: notification.sender_id,
            linked_user_id: notification.recipient_id
          }
        });

        if (!recipientInSenderList) {
          recipientInSenderList = await Person.create({
            uid: notification.sender_id,
            name: recipient.name,
            phone: recipient.phone_number,
            linked_user_id: notification.recipient_id
          });
        }

        // Sync old transactions between the newly connected users
        try {
          const { TransactionsService } = await import("./transactions.service");
          const { container } = await import("tsyringe");
          const transactionsService = container.resolve(TransactionsService);
          await transactionsService.syncOldTransactionsOnConnect(
            notification.sender_id,
            notification.recipient_id,
            senderInRecipientList.id,
            recipientInSenderList.id
          );
        } catch (error) {
          console.error("Error syncing old transactions on connection:", error);
        }
      }
    }

    const updatedNotif = await notification.update({ status });

    if (notification.type === "settle_request") {
      const { TransactionsService } = await import("./transactions.service");
      const { container } = await import("tsyringe");
      const transactionsService = container.resolve(TransactionsService);
      const recipientUser = await User.findByPk(notification.recipient_id);
      
      if (status === "accepted") {
        if (notification.data?.subType === "single") {
          await transactionsService.settleTransaction(notification.data.txId, notification.sender_id, notification.data.settleAmount, notification.data.date ? new Date(notification.data.date) : undefined, notification.data.note, true);
        } else if (notification.data?.subType === "net_balance") {
          await transactionsService.settlePersonNetBalance(notification.data.personId, notification.sender_id, notification.data.settleAmount, notification.data.date ? new Date(notification.data.date) : undefined, notification.data.note, true);
        }
      } else if (status === "rejected") {
        const { default: Transaction } = await import("../models/transaction.model");
        const { TransactionsService } = await import("./transactions.service");
        const { container } = await import("tsyringe");
        const transactionsService = container.resolve(TransactionsService);

        if (notification.data?.subType === "single") {
          const tx = await Transaction.findByPk(notification.data.txId);
          if (tx) {
            await tx.update({ status: "pending" as any });
            await transactionsService.syncMirrorStatus(tx as any, notification.sender_id, "pending");
          }
        } else if (notification.data?.subType === "net_balance") {
          const txs = await Transaction.findAll({ where: { uid: notification.sender_id, person_id: notification.data.personId, status: "settle_requested" } });
          for (const tx of txs) {
            await (tx as any).update({ status: "pending" as any });
            await transactionsService.syncMirrorStatus(tx as any, notification.sender_id, "pending");
          }
        }
      }
      
      await this.createNotification({
        recipient_id: notification.sender_id,
        sender_id: notification.recipient_id,
        type: "system",
        data: {
          message: `${recipientUser?.name || 'User'} has ${status} your settlement request.`,
          subType: "settle_response",
          status: status
        }
      });
    }

    // Send notification to the original requester (User A) about the response
    if (notification.type === "request") {
      const recipientUser = await User.findByPk(notification.recipient_id);

      // Notify User A: "User B has accepted/rejected your request"
      await this.createNotification({
        recipient_id: notification.sender_id,
        sender_id: notification.recipient_id,
        type: "request",
        data: {
          message: `${recipientUser?.name || 'Someone'} has ${status} your connection request.`,
          subType: "response",
          status: status,
          personName: recipientUser?.name
        }
      });
    }

    return updatedNotif;
  }
}
