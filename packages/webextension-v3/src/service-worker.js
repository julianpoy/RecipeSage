const API_BASE = "https://api.recipesage.com/";

// Extend the current token if it exists
let renewToken = () => {
  chrome.storage.local.get(["token"], (result) => {
    token = result.token;

    if (token)
      fetch(`${API_BASE}users/sessioncheck?token=${token}`).then((response) => {
        if (!response.ok && response.status == 401) {
          chrome.storage.local.set({ token: null });
        }
      });
  });
};

setInterval(renewToken, 1000 * 60 * 60 * 24); // Once per 24 hours

setTimeout(renewToken); // Avoid locking render loop
