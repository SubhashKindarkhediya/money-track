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
    type: "request" | "transaction" | "system";
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
    return await Notification.findAll({
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
    return await notification.update({ status: "read" });
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
        const senderInRecipientList = await Person.findOne({
          where: {
            uid: notification.recipient_id,
            linked_user_id: notification.sender_id
          }
        });

        if (!senderInRecipientList) {
          await Person.create({
            uid: notification.recipient_id,
            name: sender.name,
            phone: sender.phone_number,
            linked_user_id: notification.sender_id
          });
        }

        // 2. Ensure Recipient is in Sender's list
        const recipientInSenderList = await Person.findOne({
          where: {
            uid: notification.sender_id,
            linked_user_id: notification.recipient_id
          }
        });

        if (!recipientInSenderList) {
          await Person.create({
            uid: notification.sender_id,
            name: recipient.name,
            phone: recipient.phone_number,
            linked_user_id: notification.recipient_id
          });
        }
      }
    }

    const updatedNotif = await notification.update({ status });

    // Send notification back to the original requester (User A)
    if (notification.type === "request") {
      const recipientUser = await User.findByPk(notification.recipient_id);
      const senderUser = await User.findByPk(notification.sender_id);

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

      // Notify User B: "User A has been added to your contacts" (only on accept)
      if (status === "accepted") {
        await this.createNotification({
          recipient_id: notification.recipient_id,
          sender_id: notification.sender_id,
          type: "system",
          data: {
            message: `${senderUser?.name || 'Someone'} has been added to your contacts.`,
            subType: "connected",
            personName: senderUser?.name
          }
        });
      }
    }

    return updatedNotif;
  }
}
