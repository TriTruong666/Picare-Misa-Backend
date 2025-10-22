const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const EbizMisaCancel = sequelize.define(
  "EbizMisaCancel",
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
    haravanId: {
      type: DataTypes.BIGINT,
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
    realCarrierStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    totalLineItemPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    totalDiscountPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    refId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    refDetailId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cancelledStatus: {
      type: DataTypes.ENUM("cancelled", "uncancelled"),
      allowNull: false,
    },
    isSPXFast: {
      type: DataTypes.ENUM("normal", "fast"),
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: false,
    tableName: "EbizMisaCancel",
  }
);

module.exports = EbizMisaCancel;
