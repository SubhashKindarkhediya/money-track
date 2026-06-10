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

    // Step 3: Send notification to the linked user if they exist
    if (linked_user_id) {
      const currentUser = await User.findByPk(data.uid);
      if (currentUser) {
        await this.notificationService.createNotification({
          recipient_id: linked_user_id,
          sender_id: data.uid,
          type: "system",
          data: {
            message: `${currentUser.name} has added you as a contact in Money Track.`,
            senderName: currentUser.name,
            subType: "contact_added",
          },
        });
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
          attributes: ["phone_number", "email", "name", "upi_id", "address", "profile_picture"],
        },
      ],
    });

    const transactions = await Transaction.findAll({
      where: { uid, person_id: { [Op.ne]: null } },
      attributes: ["person_id", "type", "amount", "status", "date", "createdAt"],
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

    const summaryMap: Record<string, { totalCredit: number; totalDebit: number; latestDate: number }> = {};
    
    transactions.forEach((tx: any) => {
      if (!tx.person_id) return;
      if (!summaryMap[tx.person_id]) {
        summaryMap[tx.person_id] = { totalCredit: 0, totalDebit: 0, latestDate: 0 };
      }
      
      const txDate = tx.date ? new Date(tx.date).getTime() : new Date(tx.createdAt).getTime();
      if (txDate > summaryMap[tx.person_id].latestDate) {
        summaryMap[tx.person_id].latestDate = txDate;
      }

      if (tx.status === "pending") {
        const amount = Number(tx.amount);
        if (tx.type === "credit") summaryMap[tx.person_id].totalCredit += amount;
        if (tx.type === "debit") summaryMap[tx.person_id].totalDebit += amount;
      }
    });

    const mappedPersons = persons.map((p: any) => {
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
      
      const rawC = summaryMap[personData.id]?.totalCredit || 0;
      const rawD = summaryMap[personData.id]?.totalDebit || 0;
      let finalCredit = 0;
      let finalDebit = 0;

      if (rawC >= rawD) {
        finalCredit = rawC - rawD;
        finalDebit = 0;
      } else {
        finalCredit = 0;
        finalDebit = rawD - rawC;
      }

      return {
        ...personData,
        phone: displayPhone,
        totalCredit: finalCredit,
        totalDebit: finalDebit,
        connection_status,
        lastTransactionDate: summaryMap[personData.id]?.latestDate || new Date(personData.createdAt).getTime(),
        upi_id: personData.linkedUser?.upi_id || null,
        email: personData.linkedUser?.email || null,
        address: personData.linkedUser?.address || null,
        profile_picture: personData.linkedUser?.profile_picture || null,
      };
    });

    mappedPersons.sort((a: any, b: any) => b.lastTransactionDate - a.lastTransactionDate);

    return mappedPersons;
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
          attributes: ["phone_number", "email", "name", "upi_id", "address", "profile_picture"],
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
      person.setDataValue('upi_id' as any, (person as any).linkedUser?.upi_id || null);
      person.setDataValue('email' as any, (person as any).linkedUser?.email || null);
      person.setDataValue('address' as any, (person as any).linkedUser?.address || null);
      person.setDataValue('profile_picture' as any, (person as any).linkedUser?.profile_picture || null);
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
    const person = await Person.findOne({ where: { id, uid } });
    if (!person) {
      throw new Error("Person not found");
    }

    const previousLinkedUserId = person.linked_user_id;
    const updateData: any = { ...data };

    // If phone number is updated, re-evaluate linked_user_id
    if (data.phone !== undefined) {
      if (data.phone) {
        const existingUser = await User.findOne({
          where: { phone_number: data.phone },
        });
        updateData.linked_user_id = existingUser ? existingUser.id : null;
      } else {
        updateData.linked_user_id = null;
      }
    }

    await person.update(updateData);

    // If the person has been newly linked to a registered user, send them a notification
    if (updateData.linked_user_id && updateData.linked_user_id !== previousLinkedUserId) {
      const currentUser = await User.findByPk(uid);
      if (currentUser) {
        await this.notificationService.createNotification({
          recipient_id: updateData.linked_user_id,
          sender_id: uid,
          type: "system",
          data: {
            message: `${currentUser.name} has added you as a contact in Money Track.`,
            senderName: currentUser.name,
            subType: "contact_added",
          },
        });
      }
    }

    return await this.getPersonById(id, uid);
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
    
    // If person has a linked_user_id, delete any request notifications between them
    // This breaks the connection so the other user will see "Send Request" again
    if (person.linked_user_id) {
      const { default: Notification } = await import("../models/notification.model");
      await Notification.destroy({
        where: {
          type: 'request',
          [Op.or]: [
            { sender_id: uid, recipient_id: person.linked_user_id },
            { sender_id: person.linked_user_id, recipient_id: uid }
          ]
        }
      });

      // Send removal notification
      const currentUser = await User.findByPk(uid);
      if (currentUser) {
        await this.notificationService.createNotification({
          recipient_id: person.linked_user_id,
          sender_id: uid,
          type: "system",
          data: {
            message: `${currentUser.name} has removed you from their contacts. Transactions will no longer sync.`,
            senderName: currentUser.name,
            subType: "contact_removed",
          },
        });
      }
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
