const graylog2 = require('graylog2');

let logger;
try {
  logger = new graylog2.graylog({
    servers: [{
      host: process.env.GRAYLOG_HOST || 'graylog.recipesage.com',
      port: process.env.GRAYLOG_PORT || 12201
    }]
  });
} catch(e) {
  console.error("Graylog error", e);
}

// message: string
// body: {
//   level: string = error|warning|info
//   userId: string
//   token: string
//   err: Error
//   data: { ...any }
// }
const capture = async (message, body) => {
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "selfhost") return;

  try {
    await logger.log(message, {
      NODE_ENV: process.env.NODE_ENV,
      level: body.level || null,
      userId: body.userId || null,
      token: body.token || null,
      err: body.err || null,
      data: body.data || null
    });
  } catch(e) {
    console.error("Could not send log to Graylog", e);
  }
};

const captureException = (exception) => {
  capture(exception.message, {
    level: 'error',
    err: exception,
  });
};

const captureInfo = (message, body = {}) => {
  capture(message, {
    level: 'info',
    ...body,
  });
};

const captureWarning = (message, body = {}) => {
  capture(message, {
    level: 'warning',
    ...body,
  });
};

module.exports = {
  capture,
  captureException,
  captureInfo,
  captureWarning,
};
