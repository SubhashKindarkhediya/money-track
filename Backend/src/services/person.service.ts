import { singleton } from "tsyringe";
import Person from "../models/person.model";
import Transaction from "../models/transaction.model";
import { Op } from "sequelize";
import User from "../models/user.model";
import { NotificationService } from "./notification.service";

@singleton()
export class PersonService {
  constructor(private notificationService: NotificationService) {}

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

    const { default: Notification } = await import("../models/notification.model");
    const requestNotifications = await Notification.findAll({
      where: {
        type: 'request',
        [Op.or]: [
          { sender_id: uid },
          { recipient_id: uid }
        ]
      },
      order: [["createdAt", "DESC"]],
      raw: true
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
      const displayPhone = personData.linkedUser?.phone_number || personData.phone;
      
      let connection_status = 'none';
      if (personData.linked_user_id) {
        const hasAccepted = requestNotifications.some(n => 
          ((n.sender_id === uid && n.recipient_id === personData.linked_user_id) ||
           (n.sender_id === personData.linked_user_id && n.recipient_id === uid)) &&
          n.status === 'accepted'
        );

        if (hasAccepted) {
          connection_status = 'connected';
        } else {
          const outgoingPending = requestNotifications.find(n => 
            n.sender_id === uid && 
            n.recipient_id === personData.linked_user_id && 
            n.status === 'pending'
          );
          if (outgoingPending) {
            connection_status = 'requested';
          }
        }
      }
      
      return {
        ...personData,
        phone: displayPhone,
        totalCredit: summaryMap[personData.id]?.totalCredit || 0,
        totalDebit: summaryMap[personData.id]?.totalDebit || 0,
        connection_status
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
    const person = await Person.findOne({ 
      where,
      include: [
        {
          model: User,
          as: "linkedUser",
          attributes: ["phone_number", "email", "name"],
        },
      ]
    });
    
    if (person && uid) {
      const { default: Notification } = await import("../models/notification.model");
      const requestNotifications = await Notification.findAll({
        where: {
          type: 'request',
          [Op.or]: [
            { sender_id: uid },
            { recipient_id: uid }
          ]
        },
        order: [["createdAt", "DESC"]],
        raw: true
      });
      
      let connection_status = 'none';
      if (person.linked_user_id) {
        const hasAccepted = requestNotifications.some(n => 
          ((n.sender_id === uid && n.recipient_id === person.linked_user_id) ||
           (n.sender_id === person.linked_user_id && n.recipient_id === uid)) &&
          n.status === 'accepted'
        );

        if (hasAccepted) {
          connection_status = 'connected';
        } else {
          const outgoingPending = requestNotifications.find(n => 
            n.sender_id === uid && 
            n.recipient_id === person.linked_user_id && 
            n.status === 'pending'
          );
          if (outgoingPending) {
            connection_status = 'requested';
          }
        }
      }
      person.setDataValue('connection_status' as any, connection_status);
      const displayPhone = (person as any).linkedUser?.phone_number || person.phone;
      person.setDataValue('phone', displayPhone);
    }
    
    return person;
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

  /**
   * Manual send request notification
   */
  async sendRequest(id: string, uid: string) {
    console.log(`Sending request from user ${uid} to person ${id}`);
    const person = await this.getPersonById(id, uid);
    if (!person) {
      throw new Error("Person not found");
    }

    if (!person.linked_user_id) {
      throw new Error("Person is not on the app");
    }

    const currentUser = await User.findByPk(uid);
    if (!currentUser) {
      throw new Error("User not found");
    }

    return await this.notificationService.createNotification({
      recipient_id: person.linked_user_id,
      sender_id: uid,
      type: "request",
      data: {
        message: `${currentUser.name} wants to connect with you.`,
        senderName: currentUser.name,
        senderPhone: currentUser.phone_number,
      },
    });
  }
}
