var config = require('../config/config.json');

var grip = require('grip');
var expressGrip = require('express-grip');

expressGrip.configure({
  gripProxies: [
    // pushpin config
    {
      'control_uri': 'http://localhost:5561',
      'key': config.grip.key
    }
  ]
});

exports.expressGrip = expressGrip;

exports.broadcast = function(channel, type, data) {
  var body = {
    type: type,
    data: data || {}
  };

  expressGrip.publish(channel, new grip.WebSocketMessageFormat(body));
}
