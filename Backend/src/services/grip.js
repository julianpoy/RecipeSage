const grip = require('grip');
const expressGrip = require('express-grip');

expressGrip.configure({
  gripProxies: [
    // pushpin config
    {
      'control_uri': process.env.GRIP_URL,
      'key': process.env.GRIP_KEY
    }
  ]
});

exports.expressGrip = expressGrip;

exports.broadcast = function(channel, type, data) {
  const body = {
    type: type,
    data: data || {}
  };

  expressGrip.publish(channel, new grip.WebSocketMessageFormat(JSON.stringify(body)));
};
