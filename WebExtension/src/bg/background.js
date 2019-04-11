let messageActiveWindow = payload => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, payload);
  });
}

chrome.contextMenus.create({
  title: "Snip Image for RecipeSage Clip Tool",
  contexts: ['image'],
  onclick: e => {
    messageActiveWindow({
      action: 'snipImage',
      event: e
    });
  }
});

chrome.contextMenus.create({
  title: "Open RecipeSage Clip Tool",
  contexts: ['page'],
  onclick: e => {
    messageActiveWindow({
      action: 'show',
      event: e
    });
  }
});
