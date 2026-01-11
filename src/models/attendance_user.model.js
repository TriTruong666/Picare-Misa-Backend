const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const AttendanceServer = require("./attendance_server.model");
const { v4: uuidv4 } = require("uuid");

const AttendanceUser = sequelize.define(
  "AttendanceUser",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    empId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    empName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    checkinTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      validate: {
        isIn: [["face", "fingerprint"]],
      },
      allowNull: false,
    },
    serverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: AttendanceServer,
        key: "serverId",
      },
      onDelete: "CASCADE",
    },
  },
  {
    timestamps: false,
    tableName: "attendance_user",
  }
);

AttendanceServer.hasMany(AttendanceUser, {
  foreignKey: "serverId",
  sourceKey: "serverId",
  as: "attendance_data",
});
AttendanceUser.belongsTo(AttendanceServer, {
  foreignKey: "serverId",
  targetKey: "serverId",
  as: "server",
});

module.exports = AttendanceUser;
