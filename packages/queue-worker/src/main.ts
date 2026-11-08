import "./sentry-init.js";
import express from "express";
import client from "prom-client";
import { promisify } from "util";

import {
  getImageDeletionQueueWorker,
  getJobQueueWorker,
} from "@recipesage/util/server/general";

const jobQueueWorker = getJobQueueWorker();
jobQueueWorker.run();

const imageDeletionQueueWorker = getImageDeletionQueueWorker();
imageDeletionQueueWorker.run();

const app = express();
const port = parseInt(process.env.PORT || "3000");

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.get("/health", (_req, res) => {
  if (jobQueueWorker.closing || imageDeletionQueueWorker.closing)
    res.status(500).send("Queue closing");
  else res.status(200).send("Healthy");
});

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const close = async () => {
  console.log("CLOSING WORKER DUE TO SIGNAL");

  await Promise.allSettled([
    jobQueueWorker.close(),
    imageDeletionQueueWorker.close(),
    promisify(server.close.bind(server))(),
  ]);

  console.log("EXITED");

  process.exit(0);
};

console.log("Started queue-worker");

process.on("SIGTERM", close);
process.on("SIGINT", close);
