const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const Order = require("./order.model");

const OrderDetail = sequelize.define(
  "OrderDetail",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    productName: {
      type: DataTypes.STRING(),
      allowNull: false,
    },
  },
  {
    timestamps: false,
    tableName: "OrderDetails",
  }
);

Order.hasMany(OrderDetail, {
  foreignKey: "orderId",
  sourceKey: "orderId",
  as: "line_items",
});

OrderDetail.belongsTo(Order, {
  foreignKey: "orderId",
  targetKey: "orderId",
  as: "order",
});

module.exports = OrderDetail;
