import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { NotificationService } from "../services/notification.service";

@injectable()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * Get all notifications for the current user
   */
  getAll = async (req: Request, res: Response) => {
    try {
      const recipient_id = (req as any).user.uid;
      const notifications = await this.notificationService.getNotificationsByUserId(recipient_id);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Mark a notification as read
   */
  markAsRead = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const recipient_id = (req as any).user.uid;
      const notification = await this.notificationService.markAsRead(id, recipient_id);
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Handle request response (accept/reject)
   */
  handleResponse = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'accepted' or 'rejected'
      const recipient_id = (req as any).user.uid;

      if (!["accepted", "rejected"].includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }

      const notification = await this.notificationService.updateStatus(id, recipient_id, status);
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
