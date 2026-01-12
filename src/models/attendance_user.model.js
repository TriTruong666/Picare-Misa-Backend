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
      field: "emp_id",
    },
    empName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "emp_name",
    },
    checkinTime: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "check_in_time",
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
      field: "server_id",
      references: {
        model: AttendanceServer,
        key: "server_id",
      },
    },
  },
  {
    timestamps: false,
    tableName: "attendance_user",
  }
);

AttendanceServer.hasMany(AttendanceUser, {
  foreignKey: "serverId", // attribute
  sourceKey: "serverId", // attribute
  as: "attendance_data",
});

AttendanceUser.belongsTo(AttendanceServer, {
  foreignKey: "serverId",
  targetKey: "serverId",
  as: "server",
});

module.exports = AttendanceUser;
