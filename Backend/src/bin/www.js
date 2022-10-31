#!/usr/bin/env node

/**
 * Module dependencies.
 */

const app = require('../app');
const debug = require('debug')('chefbook-backend:server');
const jobTracker = require('../services/job-tracker.js');

const protocol = require('http');

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = protocol.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

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

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
  case 'EACCES':
    console.error(bind + ' requires elevated privileges');
    process.exit(1);
    break;
  case 'EADDRINUSE':
    console.error(bind + ' is already in use');
    process.exit(1);
    break;
  default:
    throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

const exit = () => {
  console.log('EXITING');
  process.exit(0);
};

const attemptExit = () => {
  const jobsWaiting = jobTracker.getRunningJobs().length;
  console.log('Jobs waiting: ', jobsWaiting);
  if (jobsWaiting === 0) exit();
};

process.on('SIGTERM', () => {
  console.log('RECEIVED SIGTERM - CLOSING SERVER');
  server.close(() => {
    console.log('SERVER CLOSED - RESTING');

    setInterval(attemptExit, 5 * 1000); // Job check interval
    setTimeout(exit, 300 * 1000); // Max job wait
  });
});

module.exports = server;
