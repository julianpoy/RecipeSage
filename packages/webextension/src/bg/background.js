let initClipTool = (cb) => {
  chrome.tabs.executeScript(
    {
      file: "inject/inject.js",
    },
    cb,
  );
};

let messageActiveWindow = (payload) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, payload);
  });
};

chrome.contextMenus.create({
  title: "Snip Image for RecipeSage Clip Tool",
  contexts: ["image"],
  onclick: (e) => {
    initClipTool(() => {
      messageActiveWindow({
        action: "snipImage",
        event: e,
      });
    });
  },
});

chrome.contextMenus.create({
  title: "Open RecipeSage Clip Tool",
  contexts: ["page"],
  onclick: (e) => {
    initClipTool(() => {
      messageActiveWindow({
        action: "show",
        event: e,
      });
    });
  },
});

// Extend the current token if it exists
let renewToken = () => {
  chrome.storage.local.get(["token"], (result) => {
    token = result.token;

    if (token)
      fetch(
        `https://api.recipesage.com/users/sessioncheck?token=${token}`,
      ).then((response) => {
        if (!response.ok && response.status == 401) {
          chrome.storage.local.set({ token: null });
        }
      });
  });
};

setInterval(renewToken, 1000 * 60 * 60 * 24); // Once per 24 hours

setTimeout(renewToken); // Avoid locking render loop
