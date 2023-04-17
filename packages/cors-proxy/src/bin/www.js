#!/usr/bin/env node
const cors_proxy = require('cors-anywhere');

const host = process.env.HOST || '0.0.0.0';
const port = normalizePort(process.env.PORT || 3100);
cors_proxy.createServer({
  originWhitelist: ['https://www.recipesage.com', 'https://recipesage.com', 'https://beta.recipesage.com', 'https://api.recipesage.com', 'https://localhost', 'capacitor://localhost', 'http://localhost'],
  requireHeader: ['origin'],
  handleInitialRequest: function(req) {
    // Discard request if not an image url
    // Return True = request ignored, Return False = request fulfilled
    return !req.url.includes('.png') && !req.url.includes('.jpeg') && !req.url.includes('.jpg') && !req.url.includes('.webp');
  }
}).listen(port, host, function() {
  console.log('Running CORS Anywhere on ' + host + ':' + port);
});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
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
