export const getQueueRedisOptions = () => ({
  connection: {
    host: process.env.JOB_QUEUE_REDIS_HOST,
    port: parseInt(process.env.JOB_QUEUE_REDIS_PORT || "6379"),
  },
  prefix: process.env.JOB_QUEUE_PREFIX || "rsJobQueue",
});
