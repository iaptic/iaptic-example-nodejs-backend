#!/usr/bin/env node

const http = require('http');
const app = require('./app');

// Add a verbose mode flag
const verboseMode = process.env.VERBOSE_MODE === 'true';

const port = parseInt(process.env.PORT || '8000');
const server = http.createServer(app);
server.on('error', onError);
server.on('listening', onListening);
server.listen(port);

// Event listener for HTTP server "error" event.
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // Handle specific listen errors with friendly messages.
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

// Event listener for HTTP server "listening" event.
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Listening on ' + bind);
  
  // Add verbose logging
  if (verboseMode) {
    console.log('Verbose mode enabled');
    console.log('Server configuration:');
    console.log(`- Port: ${port}`);
    console.log(`- Route prefix: ${process.env.ROUTE_PREFIX || '/demo'}`);
    console.log(`- Iaptic password set: ${!!process.env.IAPTIC_PASSWORD}`);
    console.log('Environment variables:');
    Object.keys(process.env).forEach(key => {
      if (key !== 'IAPTIC_PASSWORD') { // Don't log sensitive information
        console.log(`- ${key}: ${process.env[key]}`);
      }
    });
  }
}

// Export the verboseLogger for use in app.js
module.exports = { server };

