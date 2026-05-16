import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { TransactionsService } from "../services/transactions.service";

@injectable()
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  /**
   * Add a new transaction
   */
  create = async (req: Request, res: Response) => {
    try {
      const { person_id, type, amount, reason, note, date, status } = req.body;
      const uid = (req as any).user.uid;

      // Validation: person_id is only required for credit/debit (Udhar)
      if ((type === "credit" || type === "debit") && !person_id) {
        res.status(400).json({ error: "person_id is required for credit/debit transactions" });
        return;
      }

      if (!type || !amount) {
        res.status(400).json({ error: "type and amount are required" });
        return;
      }

      const transaction = await this.transactionsService.createTransaction({
        uid,
        person_id,
        type,
        amount,
        reason,
        note,
        status,
        date: date ? new Date(date) : undefined,
      });

      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get all transactions for the user
   */
  getAll = async (req: Request, res: Response) => {
    try {
      const uid = (req as any).user.uid;
      const transactions = await this.transactionsService.getTransactionsByUid(uid);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get transactions for a specific person
   */
  getByPerson = async (req: Request, res: Response) => {
    try {
      const { person_id } = req.params;
      const uid = (req as any).user.uid;
      const transactions = await this.transactionsService.getTransactionsByPerson(person_id, uid);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get a single transaction
   */
  getOne = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;
      const transaction = await this.transactionsService.getTransactionById(id, uid);

      if (!transaction) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Update a transaction
   */
  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { amount, reason, note, date, status } = req.body;
      const uid = (req as any).user.uid;

      const transaction = await this.transactionsService.updateTransaction(
        id,
        { amount, reason, note, date: date ? new Date(date) : undefined, status },
        uid
      );

      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Delete a transaction
   */
  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;

      await this.transactionsService.deleteTransaction(id, uid);
      res.json({ message: "Transaction deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Export transactions to PDF
   */
  exportPdf = async (req: Request, res: Response) => {
    try {
      const uid = (req as any).user.uid;
      
      // We need to dynamically import pdfkit to avoid top-level require issues
      const PDFDocument = (await import('pdfkit')).default;
      const { default: User } = await import('../models/user.model');
      
      const user = await User.findByPk(uid);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const transactions = await this.transactionsService.getTransactionsByUid(uid);
      const currencySymbol = user.currency === 'USD' ? '$' : user.currency === 'EUR' ? '€' : '₹';

      // Initialize PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Transactions_History_${user.name.replace(/\s+/g, '_')}.pdf`);

      // Pipe document to response
      doc.pipe(res);

      // --- PDF Content Generation ---
      
      // Header
      doc.fontSize(20).text('Money Track - Transaction History', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated for: ${user.name} (${user.email})`);
      doc.text(`Generated on: ${new Date().toLocaleString()}`);
      doc.moveDown();

      // Summary
      let totalCredit = 0;
      let totalDebit = 0;
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach((t: any) => {
        const amt = Number(t.amount);
        if (t.type === 'credit') totalCredit += amt;
        if (t.type === 'debit') totalDebit += amt;
        if (t.type === 'income') totalIncome += amt;
        if (t.type === 'expense') totalExpense += amt;
      });

      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(10);
      doc.text(`Total You Gave (Credit): ${currencySymbol}${totalCredit.toFixed(2)}`);
      doc.text(`Total You Got (Debit): ${currencySymbol}${totalDebit.toFixed(2)}`);
      doc.text(`Total Personal Income: ${currencySymbol}${totalIncome.toFixed(2)}`);
      doc.text(`Total Personal Expense: ${currencySymbol}${totalExpense.toFixed(2)}`);
      doc.moveDown(2);

      // Transactions List
      doc.fontSize(14).text('Detailed Transactions', { underline: true });
      doc.moveDown();

      if (transactions.length === 0) {
        doc.fontSize(10).text('No transactions found.');
      } else {
        transactions.forEach((t: any, index: number) => {
          const dateStr = new Date(t.date).toLocaleDateString();
          const personName = t.Person ? t.Person.name : 'Personal';
          const typeStr = t.type.toUpperCase();
          
          doc.fontSize(10).font('Helvetica-Bold')
             .text(`${index + 1}. ${dateStr} - ${personName} - ${typeStr} - ${currencySymbol}${t.amount}`);
             
          doc.font('Helvetica').fontSize(9);
          if (t.reason) doc.text(`Reason: ${t.reason}`);
          if (t.note) doc.text(`Note: ${t.note}`);
          doc.text(`Status: ${t.status}`);
          doc.moveDown(0.5);
        });
      }

      // Finalize the PDF and end the stream
      doc.end();

    } catch (error: any) {
      console.error("PDF Export Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF" });
      }
    }
  };
}
