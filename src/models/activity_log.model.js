const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const { v4: uuidv4 } = require("uuid");

const ActivityLog = sequelize.define(
  "ActivityLog",
  {
    logId: {
      type: DataTypes.STRING(36),
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM(
        "invoice",
        "try-login",
        "logout",
        "stock",
        "confirm",
        "accounting"
      ),
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
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
    tableName: "ActivityLog",
  }
);

module.exports = ActivityLog;
