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
      const currencySymbol = user.currency === 'USD' ? '$' : user.currency === 'EUR' ? '€' : 'Rs. ';

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
      const formattedDate = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      doc.text(`Generated on: ${formattedDate}`);
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

      // Transactions Table
      doc.fontSize(14).text('Detailed Transactions', { underline: true });
      doc.moveDown();

      if (transactions.length === 0) {
        doc.fontSize(10).text('No transactions found.');
      } else {
        const tableTop = doc.y;
        const colWidths = {
          date: 65,
          name: 110,
          type: 60,
          amount: 80,
          remarks: 180
        };
        const colPositions = {
          date: 50,
          name: 115,
          type: 225,
          amount: 285,
          remarks: 365
        };

        // Table Header
        doc.font('Helvetica-Bold').fontSize(10);
        doc.rect(50, tableTop - 5, 495, 20).fill('#f3f4f6');
        doc.fillColor('#374151');
        doc.text('Date', colPositions.date, tableTop);
        doc.text('Entity/Category', colPositions.name, tableTop);
        doc.text('Type', colPositions.type, tableTop);
        doc.text('Amount', colPositions.amount, tableTop);
        doc.text('Remarks', colPositions.remarks, tableTop);
        
        doc.moveDown();
        doc.fillColor('black').font('Helvetica').fontSize(9);

        let currentY = tableTop + 20;

        transactions.forEach((t: any, index: number) => {
          // Check for page break
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          const dateStr = new Date(t.date || t.createdAt).toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata'
          });
          const nameStr = t.Person ? t.Person.name : (t.type === 'income' || t.type === 'expense' ? 'Personal' : '-');
          const typeStr = t.type.toUpperCase();
          const amountStr = `${currencySymbol}${Number(t.amount).toLocaleString('en-IN')}`;
          const remarkStr = t.reason || t.note || '-';

          // Draw row line
          doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).stroke('#e5e7eb');

          doc.text(dateStr, colPositions.date, currentY);
          doc.text(nameStr, colPositions.name, currentY, { width: colWidths.name });
          doc.text(typeStr, colPositions.type, currentY);
          doc.text(amountStr, colPositions.amount, currentY);
          doc.text(remarkStr, colPositions.remarks, currentY, { width: colWidths.remarks });

          // Calculate height based on wrapped text
          const remarkHeight = doc.heightOfString(remarkStr, { width: colWidths.remarks });
          const nameHeight = doc.heightOfString(nameStr, { width: colWidths.name });
          const rowHeight = Math.max(remarkHeight, nameHeight, 15) + 10;
          
          currentY += rowHeight;
        });

        // Bottom border
        doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).stroke('#e5e7eb');
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

  /**
   * Settle a transaction (partial or full)
   */
  settle = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { settleAmount, date, note } = req.body;
      const uid = (req as any).user.uid;

      if (settleAmount === undefined || settleAmount === null || isNaN(Number(settleAmount)) || Number(settleAmount) <= 0) {
        res.status(400).json({ error: "Invalid settleAmount. It must be a positive number." });
        return;
      }

      const settledTx = await this.transactionsService.settleTransaction(
        id,
        uid,
        Number(settleAmount),
        date ? new Date(date) : undefined,
        note
      );

      res.json(settledTx);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
  /**
   * Settle a person's net balance
   */
  settlePerson = async (req: Request, res: Response) => {
    try {
      const { personId } = req.params;
      const { settleAmount, date, note } = req.body;
      const uid = (req as any).user.uid;

      if (settleAmount === undefined || settleAmount === null || isNaN(Number(settleAmount)) || Number(settleAmount) <= 0) {
        res.status(400).json({ error: "Invalid settleAmount. It must be a positive number." });
        return;
      }

      const result = await this.transactionsService.settlePersonNetBalance(
        personId,
        uid,
        Number(settleAmount),
        date ? new Date(date) : undefined,
        note
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
