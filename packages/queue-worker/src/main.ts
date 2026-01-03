import { jobQueueWorker } from ".";

jobQueueWorker.run();

const close = async () => {
  console.log("CLOSING WORKER DUE TO SIGNAL");

  await jobQueueWorker.close();

  console.log("EXITED CLEANLY");

  process.exit(0);
};

process.on("SIGTERM", close);
process.on("SIGINT", close);
