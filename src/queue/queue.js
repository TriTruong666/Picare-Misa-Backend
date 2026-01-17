const { Queue } = require("bullmq");
const redisClient = require("../config/redis");

const misaQueue = new Queue("misa-cron-queue", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000,
    },
  },
});

const haravanQueue = new Queue("haravan-cron-queue", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000,
    },
  },
});

const dailyQueue = new Queue("daily-cron-queue", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000,
    },
  },
});

const systemQueue = new Queue("system-cron-queue", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000,
    },
  },
});

module.exports = { misaQueue, haravanQueue, dailyQueue, systemQueue };
