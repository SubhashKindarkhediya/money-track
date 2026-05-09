import { singleton } from "tsyringe";
import Person from "../models/person.model";
import Transaction from "../models/transaction.model";
import { Op } from "sequelize";
import User from "../models/user.model";

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
    let linked_user_id: string | undefined = undefined;

    // Step 1: Check if a registered user exists with this phone number
    if (data.phone) {
      const existingUser = await User.findOne({
        where: { phone_number: data.phone },
      });
      if (existingUser) {
        linked_user_id = existingUser.id;
      }
    }

    // Step 2: Create Subhash's Person entry (Ramesh in Subhash's list)
    const newPerson = await Person.create({ ...data, linked_user_id });

    // Step 3: AUTO CONNECT — If Ramesh is on the app,
    // automatically add Subhash in Ramesh's person list too
    if (linked_user_id) {
      // Get Subhash's (current user's) info to create his entry in Ramesh's list
      const currentUser = await User.findByPk(data.uid);

      if (currentUser && currentUser.phone_number) {
        // Check if Ramesh already has Subhash in his list (avoid duplicate)
        const alreadyExists = await Person.findOne({
          where: {
            uid: linked_user_id,           // Ramesh's account
            phone: currentUser.phone_number, // Subhash's phone
          },
        });

        if (!alreadyExists) {
          // Create Subhash as a Person in Ramesh's list
          await Person.create({
            uid: linked_user_id,           // Ramesh's user ID (owner)
            name: currentUser.name,        // Subhash's name
            phone: currentUser.phone_number, // Subhash's phone
            linked_user_id: data.uid,      // Points back to Subhash's user ID
          });
        }
      }
    }

    return newPerson;
  }

  /**
   * Get all persons for a specific user
   * @param uid
   */
  async getAllByUserId(uid: string) {
    const persons = await Person.findAll({
      where: { uid },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "linkedUser",
          attributes: ["phone_number", "email", "name"],
        },
      ],
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

    return persons.map((p: any) => {
      const personData = p.get({ plain: true });
      // Priority: 1. Latest phone from Linked User, 2. Saved phone in Person record
      const displayPhone = personData.linkedUser?.phone_number || personData.phone;
      
      return {
        ...personData,
        phone: displayPhone,
        totalCredit: summaryMap[personData.id]?.totalCredit || 0,
        totalDebit: summaryMap[personData.id]?.totalDebit || 0,
      };
    });
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
