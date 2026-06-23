import { Request, Response } from "express";
import { Group, GroupMember, Person } from "../models";
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
        }));
        await GroupMember.bulkCreate(groupMembers, { transaction: t });
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
      const groups = await Group.findAll({
        where: { uid },
        include: [{ model: Person, as: 'members' }],
        order: [["createdAt", "DESC"]],
      });
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
