import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { PersonService } from "../services/person.service";

@injectable()
export class PersonController {
  constructor(private personService: PersonService) {}

  /**
   * Add a new person
   */
  create = async (req: Request, res: Response) => {
    try {
      const { name, phone, notes } = req.body;
      const uid = (req as any).user.uid; // Get from token

      if (!name) {
        res.status(400).json({ error: "Name is required" });
        return;
      }

      const person = await this.personService.createPerson({
        name,
        phone,
        notes,
        uid,
      });

      res.status(201).json(person);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get all people
   */
  getAll = async (req: Request, res: Response) => {
    try {
      const uid = (req as any).user.uid;
      const persons = await this.personService.getAllByUserId(uid);
      res.json(persons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get person by ID
   */
  getOne = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;
      const person = await this.personService.getPersonById(id, uid);

      if (!person) {
        res.status(404).json({ error: "Person not found" });
        return;
      }

      res.json(person);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Update person
   */
  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, phone, notes } = req.body;
      const uid = (req as any).user.uid;

      const person = await this.personService.updatePerson(
        id,
        { name, phone, notes },
        uid,
      );

      res.json(person);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Delete person
   */
  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;

      await this.personService.deletePerson(id, uid);
      res.json({ message: "Person deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
