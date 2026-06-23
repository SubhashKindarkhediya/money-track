import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";

interface GroupMemberAttributes {
  group_id: string;
  person_id: string;
}

class GroupMember extends Model<GroupMemberAttributes> implements GroupMemberAttributes {
  public group_id!: string;
  public person_id!: string;
}

GroupMember.init(
  {
    group_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    person_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "group_members",
    timestamps: false,
  }
);

export default GroupMember;
