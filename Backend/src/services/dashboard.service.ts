import { singleton } from "tsyringe";
import { Op } from "sequelize";
import Transaction from "../models/transaction.model";

@singleton()
export class DashboardService {
  /**
   * Get financial summary for a user (Total Overall or Date Range)
   * @param uid
   */
  async getSummary(uid: string, startDate?: string, endDate?: string) {
    const whereCondition: any = { uid };

    if (startDate && endDate) {
      whereCondition.date = {
        [Op.gte]: new Date(`${startDate}T00:00:00.000Z`),
        [Op.lte]: new Date(`${endDate}T23:59:59.999Z`),
      };
    } else if (startDate) {
       whereCondition.date = { [Op.gte]: new Date(`${startDate}T00:00:00.000Z`) };
    } else if (endDate) {
       whereCondition.date = { [Op.lte]: new Date(`${endDate}T23:59:59.999Z`) };
    }

    // 1. Calculate Udhar Statistics
    const rawCredit = await Transaction.sum("amount", {
      where: { ...whereCondition, type: "credit", status: "pending" },
    }) || 0;

    const rawDebit = await Transaction.sum("amount", {
      where: { ...whereCondition, type: "debit", status: "pending" },
    }) || 0;

    let totalCredit = 0;
    let totalDebit = 0;

    if (rawCredit >= rawDebit) {
      totalCredit = rawCredit - rawDebit;
      totalDebit = 0;
    } else {
      totalCredit = 0;
      totalDebit = rawDebit - rawCredit;
    }

    // 2. Calculate Personal Statistics
    const totalIncome = await Transaction.sum("amount", {
      where: { ...whereCondition, type: "income" },
    }) || 0;

    const totalExpense = await Transaction.sum("amount", {
      where: { ...whereCondition, type: "expense" },
    }) || 0;

    return {
      udhar: {
        totalCredit,
        totalDebit,
        netBalance: totalCredit - totalDebit,
      },
      personal: {
        totalIncome,
        totalExpense,
        savings: totalIncome - totalExpense,
      }
    };
  }

  /**
   * Get a detailed report for a specific month
   */
  async getMonthlyReport(uid: string, month: number, year: number) {
    // Define the start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Fetch all transactions for this month
    const transactions = await Transaction.findAll({
      where: {
        uid,
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [["date", "ASC"]],
    });

    // 2. Calculate Monthly Totals
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let rawMonthlyCredit = 0;
    let rawMonthlyDebit = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === "income") monthlyIncome += amount;
      if (t.type === "expense") monthlyExpense += amount;
      // Only count credit/debit in summary if they are pending
      if (t.type === "credit" && t.status === "pending") rawMonthlyCredit += amount;
      if (t.type === "debit" && t.status === "pending") rawMonthlyDebit += amount;
    });

    let monthlyCredit = 0;
    let monthlyDebit = 0;

    if (rawMonthlyCredit >= rawMonthlyDebit) {
      monthlyCredit = rawMonthlyCredit - rawMonthlyDebit;
      monthlyDebit = 0;
    } else {
      monthlyCredit = 0;
      monthlyDebit = rawMonthlyDebit - rawMonthlyCredit;
    }

    return {
      period: { month, year },
      summary: {
        income: monthlyIncome,
        expense: monthlyExpense,
        credit: monthlyCredit,
        debit: monthlyDebit,
      },
      transactions: transactions, // Full list for the user to see "where money went"
    };
  }
}
