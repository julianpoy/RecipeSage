export enum SWMessageType {
  GetDebugDump = "getDebugDump",
}

export class SendSWMessageTimeoutError extends Error {
  constructor() {
    super();
    this.name = "SendMessageTimeoutError";
  }
}

export class SendSWMessageNoSWError extends Error {
  constructor() {
    super();
    this.name = "SendSWMessageNoSWError";
  }
}

export async function sendMessageToSW(
  message: {
    type: SWMessageType;
  },
  opts: {
    timeout?: number;
  },
) {
  const promises: Promise<unknown>[] = [];

  if (!navigator.serviceWorker.controller) {
    throw new SendSWMessageNoSWError();
  }

  const responsePromise = new Promise(function (resolve, reject) {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function (event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };
    // This sends the message data as well as transferring
    // messageChannel.port2 to the service worker.
    // The service worker can then use the transferred port to reply
    // via postMessage(), which will in turn trigger the onmessage
    // handler on messageChannel.port1.
    // See
    // https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
    navigator.serviceWorker.controller?.postMessage(message, [
      messageChannel.port2,
    ]);
  });
  promises.push(responsePromise);

  if (opts.timeout) {
    promises.push(
      new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new SendSWMessageTimeoutError());
        }, opts.timeout);
      }),
    );
  }

  await Promise.race(promises);

  return responsePromise;
}
