const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const ActivityLog = sequelize.define(
  "ActivityLog",
  {
    logId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "log_id",
    },
    type: {
      type: DataTypes.STRING,
      validate: {
        isIn: [
          ["invoice", "try-login", "logout", "stock", "confirm", "accounting"],
        ],
      },
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "user_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
    tableName: "activity_logs",
  }
);

module.exports = ActivityLog;
