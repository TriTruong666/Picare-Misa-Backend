const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const MisaConfig = sequelize.define(
  "MisaConfig",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    accessToken: {
      type: DataTypes.STRING,
      unique: true,
    },
  },
  {
    timestamps: true,
    tableName: "misa_configs",
  }
);

module.exports = MisaConfig;
