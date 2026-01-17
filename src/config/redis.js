const Redis = require("ioredis");

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
});

module.exports = redisClient;
