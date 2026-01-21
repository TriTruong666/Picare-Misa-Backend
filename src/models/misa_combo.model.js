const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const MisaCombo = sequelize.define(
  "MisaCombo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rowNumber: {
      type: DataTypes.INTEGER,
      field: "row_number",
      allowNull: true,
    },
    inventoryItemCode: {
      type: DataTypes.STRING,
      field: "inventory_item_code",
    },
    maCombo: {
      type: DataTypes.STRING,
      field: "ma_combo",
    },
    quantity: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "misa_combos",
  }
);

module.exports = MisaCombo;
