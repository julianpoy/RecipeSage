#!/usr/bin/env node

/**
 * Module dependencies.
 */

import { app } from "../app";
import Debug from "debug";
const debug = Debug("chefbook-backend:server");
import { getRunningJobs } from "../services/job-tracker.js";
import protocol from "http";

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

/**
 * Create HTTP server.
 */
export const server = protocol.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error: Error & { syscall: string; code: string }) {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      return process.exit(1);
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      return process.exit(1);
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr?.port;
  debug("Listening on " + bind);
}

const exit = () => {
  console.log("EXITING");
  process.exit(0);
};

const attemptExit = () => {
  const jobsWaiting = getRunningJobs().length;
  console.log("Jobs waiting: ", jobsWaiting);
  if (jobsWaiting === 0) exit();
};

const termHandler = async () => {
  if (process.env.NODE_ENV !== "production") {
    process.exit(0);
  }

  console.log("RECEIVED SIGNAL - CLOSING SERVER");
  server.close(() => {
    console.log("SERVER CLOSED - RESTING");

    setInterval(attemptExit, 5 * 1000); // Job check interval
    setTimeout(exit, 300 * 1000); // Max job wait
  });
};

process.on("SIGTERM", termHandler);
process.on("SIGINT", termHandler);
