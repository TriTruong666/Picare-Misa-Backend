const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const EbizMisaDone = sequelize.define(
  "EbizMisaDone",
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
      type: DataTypes.STRING,
      validate: {
        isIn: [
          [
            "pending",
            "paid",
            "partially_paid",
            "refunded",
            "voided",
            "partially_refunded",
          ],
        ],
      },
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
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    totalLineItemPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    totalDiscountPrice: {
      type: DataTypes.DECIMAL(12, 2),
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
    cancelledStatus: {
      type: DataTypes.STRING,
      validate: {
        isIn: [["cancelled", "uncancelled"]],
      },
      allowNull: false,
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isSPXFast: {
      type: DataTypes.STRING,
      validate: {
        isIn: [["normal", "fast"]],
      },
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
    tableName: "ebiz_misa_done",
  }
);

module.exports = EbizMisaDone;
