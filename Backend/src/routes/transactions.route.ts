import { Router } from "express";
import { container } from "tsyringe";
import { TransactionsController } from "../controllers/transactions.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Resolve controller from DI container
const transactionsController = container.resolve(TransactionsController);

// Protect all transaction routes
router.use(authMiddleware);

// Endpoints
router.post("/", transactionsController.create);          // Add transaction
router.get("/", transactionsController.getAll);           // List all
router.get("/export/pdf", transactionsController.exportPdf); // Export as PDF
router.get("/group/:group_id", transactionsController.getByGroup); // By group
router.get("/:id", transactionsController.getOne);        // Single transaction
router.put("/:id", transactionsController.update);        // Update transaction
router.post("/:id/settle", transactionsController.settle);  // Settle transaction (partial/full)
router.delete("/:id", transactionsController.delete);     // Delete transaction
router.get("/person/:person_id", transactionsController.getByPerson); // By person
router.post("/person/:personId/settle", transactionsController.settlePerson); // Settle person net balance

export default router;
