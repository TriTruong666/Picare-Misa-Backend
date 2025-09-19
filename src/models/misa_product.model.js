const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const MisaProduct = sequelize.define(
  "MisaProduct",
  {
    inventory_item_id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    inventory_item_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    inventory_item_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    unit_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    unit_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tax_rate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    timestamps: false,
    tableName: "MisaProduct",
  }
);

module.exports = MisaProduct;
