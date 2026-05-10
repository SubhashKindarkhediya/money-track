import { Router } from "express";
import { container } from "tsyringe";
import { PersonController } from "../controllers/person.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Resolve the controller from the DI container
// Resolve the controller from the DI container
const personController = container.resolve(PersonController);

// Apply Auth Middleware to ALL person routes
// This ensures only logged-in users can access these APIs
router.use(authMiddleware);

// Define API endpoints for Person
router.post("/", personController.create);      // Add a person
router.get("/", personController.getAll);       // List all persons
router.get("/:id", personController.getOne);    // Get single person
router.put("/:id", personController.update);    // Update person
router.delete("/:id", personController.delete); // Delete person

router.post("/:id/request", personController.sendRequest); // Send connection request

export default router;
