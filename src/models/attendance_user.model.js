const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const AttendanceServer = require("./attendance_server.model");
const { v4: uuidv4 } = require("uuid");

const AttendanceUser = sequelize.define(
  "AttendanceUser",
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
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
    serverId: {
      type: DataTypes.STRING(36),
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
    tableName: "AttendanceUser",
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
