const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const { v4: uuidv4 } = require("uuid");

const AttendanceServer = sequelize.define(
  "AttendanceServer",
  {
    serverId: {
      type: DataTypes.UUID,
      unique: true,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      field: "server_id",
    },
    serverName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "server_name",
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
    tableName: "attendance_server",
  }
);

module.exports = AttendanceServer;
