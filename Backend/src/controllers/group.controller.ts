import { Request, Response } from "express";
import { Op } from "sequelize";
import { Group, GroupMember, Person, Transaction, Notification, User } from "../models";
import sequelize from "../config/db";

export class GroupController {
  /**
   * Create a new group
   */
  createGroup = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
      const uid = (req as any).user.uid;
      const { name, description, type, member_ids } = req.body;

      if (!name) {
        res.status(400).json({ error: "Group name is required" });
        return;
      }

      const group = await Group.create(
        {
          uid,
          name,
          description,
          type,
        },
        { transaction: t }
      );

      if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
        const groupMembers = member_ids.map((person_id: string) => ({
          group_id: group.id,
          person_id,
          status: 'pending'
        }));
        await GroupMember.bulkCreate(groupMembers, { transaction: t });

        // Notifications
        const persons = await Person.findAll({ where: { id: member_ids }, transaction: t });
        const notifications: any[] = [];
        for (const person of persons) {
          if (person.linked_user_id) {
            notifications.push({
              recipient_id: person.linked_user_id,
              sender_id: uid,
              type: "group_invite",
              status: "pending",
              data: {
                group_id: group.id,
                group_name: group.name,
                person_id: person.id
              }
            });
          }
        }
        if (notifications.length > 0) {
          await Notification.bulkCreate(notifications, { transaction: t });
        }
      }

      await t.commit();

      const createdGroup = await Group.findByPk(group.id, {
        include: [{ model: Person, as: 'members' }]
      });

      res.status(201).json(createdGroup);
    } catch (error: any) {
      await t.rollback();
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get all groups for user
   */
  getGroups = async (req: Request, res: Response) => {
    try {
      const uid = (req as any).user.uid;

      const userPersons = await Person.findAll({ where: { linked_user_id: uid } });
      const userPersonIds = userPersons.map(p => p.id);

      const joinedGroupMembers = await GroupMember.findAll({
        where: { person_id: userPersonIds, status: 'joined' }
      });
      const joinedGroupIds = joinedGroupMembers.map(m => m.group_id);

      const groups = await Group.findAll({
        where: {
          [Op.or]: [
            { uid },
            { id: joinedGroupIds }
          ]
        },
        include: [
          { model: Person, as: 'members' },
          { model: Transaction, as: 'transactions' }
        ],
        order: [["createdAt", "DESC"]],
      });
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get single group by ID
   */
  getGroupById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;

      let hasAccess = false;
      const group = await Group.findByPk(id, {
        include: [
          { model: Person, as: 'members' },
          { model: User, attributes: ['id', 'name', 'email'] }
        ]
      });

      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }

      if (group.uid === uid) {
        hasAccess = true;
      } else {
        const userPersons = await Person.findAll({ where: { linked_user_id: uid } });
        const userPersonIds = userPersons.map(p => p.id);
        const member = await GroupMember.findOne({ where: { group_id: id, person_id: userPersonIds, status: 'joined' } });
        if (member) hasAccess = true;
      }

      if (!hasAccess) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      res.json(group);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Update a group
   */
  updateGroup = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;
      const { name, type, member_ids } = req.body;

      const group = await Group.findByPk(id);
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }

      const isAdmin = group.uid === uid;

      // Check if user is a member
      let isMember = false;
      if (!isAdmin) {
        const userPersons = await Person.findAll({ where: { linked_user_id: uid } });
        const userPersonIds = userPersons.map(p => p.id);
        const memberRecord = await GroupMember.findOne({ where: { group_id: id, person_id: userPersonIds, status: 'joined' } });
        if (memberRecord) isMember = true;
      }

      if (!isAdmin && !isMember) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      // Non-admins can only update name
      await group.update({
        name: name || group.name,
        type: isAdmin ? (type || group.type) : group.type
      }, { transaction: t });

      if (member_ids && Array.isArray(member_ids)) {
        const existingMembers = await GroupMember.findAll({ where: { group_id: id }, transaction: t });
        const existingPersonIds = existingMembers.map(m => m.person_id);

        if (!isAdmin) {
          // Non-admin cannot remove existing members. They can only add new ones.
          const removedIds = existingPersonIds.filter(pid => !member_ids.includes(pid));
          if (removedIds.length > 0) {
            await t.rollback();
            res.status(403).json({ error: "Only admin can remove members." });
            return;
          }
        }

        await GroupMember.destroy({ where: { group_id: id }, transaction: t });
        if (member_ids.length > 0) {
          // Remove duplicates
          const uniqueMemberIds = [...new Set(member_ids)];
          const groupMembers = uniqueMemberIds.map((person_id: any) => ({
            group_id: id,
            person_id,
          }));
          await GroupMember.bulkCreate(groupMembers, { transaction: t });
        }
      }

      await t.commit();
      res.json({ message: "Group updated successfully" });
    } catch (error: any) {
      await t.rollback();
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Delete a group
   */
  deleteGroup = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;

      const group = await Group.findOne({ where: { id, uid } });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }

      const pendingInvites = await Notification.findAll({
        where: { sender_id: uid, type: 'group_invite', status: 'pending' }
      });
      for (const invite of pendingInvites) {
        if (invite.data && invite.data.group_id === id) {
          await invite.destroy();
        }
      }

      await group.destroy();
      res.json({ message: "Group deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Join a group
   */
  joinGroup = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;

      const persons = await Person.findAll({ where: { linked_user_id: uid }, transaction: t });
      const personIds = persons.map(p => p.id);

      const groupMember = await GroupMember.findOne({
        where: { group_id: id, person_id: personIds },
        transaction: t
      });

      if (!groupMember) {
        await t.rollback();
        res.status(404).json({ error: "Group invite not found" });
        return;
      }

      await groupMember.update({ status: 'joined' }, { transaction: t });

      const notifications = await Notification.findAll({
        where: { recipient_id: uid, type: 'group_invite', status: 'pending' },
        transaction: t
      });

      for (const notif of notifications) {
        if (notif.data && notif.data.group_id === id) {
          await notif.update({ status: 'accepted' }, { transaction: t });
        }
      }

      const group = await Group.findByPk(id, { transaction: t });
      if (group) {
        const person = await Person.findByPk(groupMember.person_id, { transaction: t });
        await Notification.create({
          recipient_id: group.uid,
          sender_id: uid,
          type: "group_joined",
          status: "pending",
          data: {
            message: `${person?.name || 'A user'} has joined your group: ${group.name}`,
            personName: person?.name || 'A user' // Also adding it to personName so UI can use it
          }
        }, { transaction: t });
      }

      await t.commit();
      res.json({ message: "Joined group successfully" });
    } catch (error: any) {
      await t.rollback();
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Leave a group
   */
  leaveGroup = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const uid = (req as any).user.uid;

      const persons = await Person.findAll({ where: { linked_user_id: uid }, transaction: t });
      const personIds = persons.map(p => p.id);

      const groupMember = await GroupMember.findOne({
        where: { group_id: id, person_id: personIds },
        transaction: t
      });

      if (!groupMember) {
        await t.rollback();
        res.status(404).json({ error: "You are not in this group" });
        return;
      }

      await groupMember.destroy({ transaction: t });

      await t.commit();
      res.json({ message: "Left group successfully" });
    } catch (error: any) {
      await t.rollback();
      res.status(500).json({ error: error.message });
    }
  };
}
