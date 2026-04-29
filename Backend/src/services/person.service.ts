import { singleton } from "tsyringe";
import Person from "../models/person.model";
import Transaction from "../models/transaction.model";
import { Op } from "sequelize";

@singleton()
export class PersonService {
  /**
   * Create a new contact (Person)
   * @param data { name, phone, notes, uid }
   */
  async createPerson(data: {
    name: string;
    phone?: string;
    notes?: string;
    uid: string;
  }) {
    return await Person.create(data);
  }

  /**
   * Get all persons for a specific user
   * @param uid
   */
  async getAllByUserId(uid: string) {
    const persons = await Person.findAll({
      where: { uid },
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    const transactions = await Transaction.findAll({
      where: { uid, person_id: { [Op.ne]: null }, status: "pending" },
      attributes: ["person_id", "type", "amount"],
      raw: true,
    });

    const summaryMap: Record<string, { totalCredit: number; totalDebit: number }> = {};
    
    transactions.forEach((tx: any) => {
      if (!tx.person_id) return;
      if (!summaryMap[tx.person_id]) {
        summaryMap[tx.person_id] = { totalCredit: 0, totalDebit: 0 };
      }
      const amount = Number(tx.amount);
      if (tx.type === "credit") summaryMap[tx.person_id].totalCredit += amount;
      if (tx.type === "debit") summaryMap[tx.person_id].totalDebit += amount;
    });

    return persons.map((p: any) => ({
      ...p,
      totalCredit: summaryMap[p.id]?.totalCredit || 0,
      totalDebit: summaryMap[p.id]?.totalDebit || 0,
    }));
  }

  /**
   * Get a single person by ID
   * @param id
   * @param uid (optional, for security)
   */
  async getPersonById(id: string, uid?: string) {
    const where: any = { id };
    if (uid) where.uid = uid;
    return await Person.findOne({ where });
  }

  /**
   * Update a person's details
   * @param id
   * @param data
   * @param uid
   */
  async updatePerson(
    id: string,
    data: { name?: string; phone?: string; notes?: string },
    uid: string
  ) {
    const person = await this.getPersonById(id, uid);
    if (!person) {
      throw new Error("Person not found");
    }
    return await person.update(data);
  }

  /**
   * Delete a person
   * @param id
   * @param uid
   */
  async deletePerson(id: string, uid: string) {
    const person = await this.getPersonById(id, uid);
    if (!person) {
      throw new Error("Person not found");
    }
    await person.destroy();
    return true;
  }
}
