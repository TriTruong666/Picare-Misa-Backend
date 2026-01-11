const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const MisaCustomer = sequelize.define(
  "MisaCustomer",
  {
    account_object_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    account_object_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_object_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_object_group_id_list: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    account_object_group_name_list: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    account_object_group_code_list: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: false,
    tableName: "misa_customers",
  }
);

module.exports = MisaCustomer;
