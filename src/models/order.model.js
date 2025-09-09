const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    saleDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    financialStatus: {
      type: DataTypes.ENUM(
        "pending",
        "paid",
        "partially_paid",
        "refunded",
        "voided",
        "partially_refunded"
      ),
      allowNull: false,
    },
    carrierStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cancelledStatus: {
      type: DataTypes.ENUM("cancelled", "uncancelled"),
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    note: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: false,
    tableName: "Orders",
  }
);

module.exports = Order;
