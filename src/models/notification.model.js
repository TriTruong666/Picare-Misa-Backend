const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const { v4: uuidv4 } = require("uuid");

const Notification = sequelize.define(
  "Notification",
  {
    notificationId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      unique: true,
      field: "notification_id",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "Notification",
  }
);

module.exports = Notification;
