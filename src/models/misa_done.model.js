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
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "order_id",
    },
    haravanId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "haravan_id",
    },
    saleDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "sale_date",
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
      allowNull: true,
      field: "financial_status",
    },
    carrierStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "carrier_status",
    },
    realCarrierStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "real_carrier_status",
    },
    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: "total_price",
    },
    totalLineItemPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: "total_line_item_price",
    },
    totalDiscountPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: "total_discount_price",
    },
    refId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "ref_id",
    },
    refDetailId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "ref_detail_id",
    },
    cancelledStatus: {
      type: DataTypes.STRING,
      validate: {
        isIn: [["cancelled", "uncancelled"]],
      },
      allowNull: true,
      field: "cancelled_status",
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "tracking_number",
    },
    isSPXFast: {
      type: DataTypes.STRING,
      validate: {
        isIn: [["normal", "fast"]],
      },
      allowNull: true,
      field: "is_spx_fast",
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
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
