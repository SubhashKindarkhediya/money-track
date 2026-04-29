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
}
