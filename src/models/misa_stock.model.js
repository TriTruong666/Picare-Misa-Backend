const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const MisaStock = sequelize.define(
  "MisaStock",
  {
    stock_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    stock_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stock_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: false,
    tableName: "misa_stock",
  }
);

module.exports = MisaStock;
