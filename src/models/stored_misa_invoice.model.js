const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const StoredMisaInvoice = sequelize.define(
  "StoredMisaInvoice",
  {
    refId: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
    tableName: "StoredMisaInvoice",
  }
);

module.exports = StoredMisaInvoice;
