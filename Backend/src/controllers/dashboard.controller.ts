import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { DashboardService } from "../services/dashboard.service";

@injectable()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  /**
   * Get dashboard summary
   */
  getSummary = async (req: Request, res: Response) => {
    try {
      const uid = (req as any).user.uid;
      const summary = await this.dashboardService.getSummary(uid);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get detailed monthly report
   */
  getReport = async (req: Request, res: Response) => {
    try {
      const uid = (req as any).user.uid;
      
      // Get month and year from query, or use current date
      const now = new Date();
      const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
      const year = req.query.year ? Number(req.query.year) : now.getFullYear();

      const report = await this.dashboardService.getMonthlyReport(uid, month, year);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
