// This file for using JOB Queue(Non-function here)
const cron = require("node-cron");
const {
  misaQueue,
  haravanQueue,
  dailyQueue,
  systemQueue,
} = require("../queue/queue");

cron.schedule("*/30 * * * *", () => {
  misaQueue.add("build-document");
});

cron.schedule("*/29 * * * *", () => {
  misaQueue.add("move-cancel-order");
});

cron.schedule("*/15 * * * *", () => {
  misaQueue.add("init-data");
});

cron.schedule("*/25 * * * *", () => {
  haravanQueue.add("sync-orders");
});

cron.schedule("0 0 * * *", () => {
  dailyQueue.add("delete-order");
});

cron.schedule("0 0 * * *", () => {
  dailyQueue.add("delete-activity-log");
});

cron.schedule("*/24 * * * *", () => {
  systemQueue.add("notify-sync-order");
});

cron.schedule("*/30 * * * * *", () => {
  systemQueue.add("check-health");
});
