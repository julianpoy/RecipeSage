var grip = require('grip');
var expressGrip = require('express-grip');

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
  var body = {
    type: type,
    data: data || {}
  };

  expressGrip.publish(channel, new grip.WebSocketMessageFormat(JSON.stringify(body)));
}
