let initClipTool = cb => {
  chrome.tabs.executeScript({
    file: 'inject/inject.js'
  }, cb);
}

let messageActiveWindow = payload => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, payload);
  });
}

chrome.contextMenus.create({
  title: "Snip Image for RecipeSage Clip Tool",
  contexts: ['image'],
  onclick: e => {
    initClipTool(() => {
      messageActiveWindow({
        action: 'snipImage',
        event: e
      });
    });
  }
});

chrome.contextMenus.create({
  title: "Open RecipeSage Clip Tool",
  contexts: ['page'],
  onclick: e => {
    initClipTool(() => {
      messageActiveWindow({
        action: 'show',
        event: e
      });
    });
  }
});

chrome.extension.onConnect.addListener((port) => {
  console.log("Connected to injected script");

  port.onMessage.addListener((msg) => {
    const parsed = JSON.parse(msg);

    if (parsed.type === 'save') {
      chrome.storage.local.get(['token'], result => {
        token = result.token;

        fetch(`https://api.recipesage.com/recipes?token=${token}`, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(parsed.currentSnip)
        }).then(async (response) => {
          port.postMessage(JSON.stringify({
            type: 'saveResult',
            status: response.status,
            data: response.ok && await response.json(),
            nonce: parsed.nonce,
          }));
        });
      });
    }
  });
})

// Extend the current token if it exists
let renewToken = () => {
  chrome.storage.local.get(['token'], result => {
    token = result.token;

    if (token) fetch(`https://api.recipesage.com/users/sessioncheck?token=${token}`).then(response => {
      if (!response.ok && response.status == 401) {
        chrome.storage.local.set({ token: null });
      }
    });
  });
}

setInterval(renewToken, 1000 * 60 * 60 * 24); // Once per 24 hours

setTimeout(renewToken); // Avoid locking render loop
