import * as grip from "grip";
import * as expressGrip from "express-grip";

expressGrip.configure({
  gripProxies: [
    // pushpin config
    {
      control_uri: process.env.GRIP_URL,
      key: process.env.GRIP_KEY,
    },
  ],
});

const broadcast = function (channel, type, data) {
  const body = {
    type: type,
    data: data || {},
  };

  expressGrip.publish(
    channel,
    new grip.WebSocketMessageFormat(JSON.stringify(body)),
  );
};

export { expressGrip, broadcast };
