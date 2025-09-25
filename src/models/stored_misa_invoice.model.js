const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const StoredMisaInvoice = sequelize.define("StoredMisaInvoice", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
});
