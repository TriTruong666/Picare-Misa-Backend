const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_SERVER,
    port: process.env.DB_PORT || 1433,
    dialect: "mssql",
    dialectOptions: {
      options: {
        encrypt: false, // local thì để false
        trustServerCertificate: true,
      },
    },
    timezone: "+07:00",
    logging: false,
  }
);

module.exports = sequelize;
