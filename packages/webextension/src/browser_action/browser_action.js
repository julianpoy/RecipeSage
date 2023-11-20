let messageActiveWindow = (payload, cb) => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, payload, cb);
  });
};

let token;

let login = () => {
  return fetch("https://api.recipesage.com/users/login", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    referrer: "no-referrer",
    body: JSON.stringify({
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
    }),
  })
    .then((response) => {
      if (response.ok) {
        response.json().then((data) => {
          // Save the token
          chrome.storage.local.set({ token: data.token }, () => {
            token = data.token;

            chrome.storage.local.get(["seenTutorial"], (result) => {
              if (result.seenTutorial) {
                document.getElementById("message").innerText =
                  "You are now logged in. Launching the snip tool...";
                setTimeout(() => {
                  launch();
                }, 2000);
              } else {
                tutorial();
              }
            });
          });
        });
      } else {
        switch (response.status) {
          case 412:
            document.getElementById("message").innerText =
              "It looks like that email or password isn't correct.";
            break;
          default:
            document.getElementById("message").innerText =
              "Something went wrong. Please try again.";
            break;
        }
      }
    })
    .catch((e) => {
      document.getElementById("message").innerText =
        "Something went wrong. Please check your internet connection and try again.";
    });
};

let tutorial = () => {
  newClip();
  document.getElementById("login").style.display = "none";
  document.getElementById("tutorial").style.display = "block";
};

let launch = () => {
  newClip();
  window.close();
};

let newClip = () => {
  chrome.tabs.executeScript({
    file: "/inject/inject.js",
  });
};

let tokenFetchPromise = new Promise((resolve, reject) => {
  chrome.storage.local.get(["token"], (result) => {
    token = result.token;

    // If user is logged in, launch the tool
    if (token) {
      launch();
      reject();
    } else {
      resolve();
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-logo").src = chrome.extension.getURL(
    "./images/recipesage-black-trimmed.png",
  );
  document.getElementById("tutorial-logo").src = chrome.extension.getURL(
    "./images/recipesage-black-trimmed.png",
  );
  document.getElementById("login-submit").onclick = login;
  document.getElementById("tutorial-submit").onclick = () => window.close();

  tokenFetchPromise
    .then(() => {
      document.getElementsByTagName("html")[0].style.display = "initial";
    })
    .catch(() => {});
});
