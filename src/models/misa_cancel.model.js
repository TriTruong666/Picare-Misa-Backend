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
      allowNull: false,
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
      allowNull: false,
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
      allowNull: false,
      field: "total_price",
    },
    totalLineItemPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: "total_line_item_price",
    },
    totalDiscountPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: "total_discount_price",
    },
    refId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "ref_id",
    },
    refDetailId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "ref_detail_id",
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "tracking_number",
    },
    cancelledStatus: {
      type: DataTypes.STRING,
      validate: {
        isIn: [["cancelled", "uncancelled"]],
      },
      allowNull: false,
      field: "cancelled_status",
    },
    isSPXFast: {
      type: DataTypes.STRING,
      validate: {
        isIn: [["normal", "fast"]],
      },
      allowNull: false,
      field: "is_spx_fast",
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "customer_name",
    },
  },
  {
    timestamps: false,
    tableName: "ebiz_misa_cancel",
  }
);

module.exports = EbizMisaCancel;
