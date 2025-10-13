const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const { v4: uuidv4 } = require("uuid");

const AttendanceServer = sequelize.define(
  "AttendanceServer",
  {
    serverId: {
      type: DataTypes.STRING(36),
      unique: true,
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
    },
    serverName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: "AttendanceServer",
  }
);

module.exports = AttendanceServer;
