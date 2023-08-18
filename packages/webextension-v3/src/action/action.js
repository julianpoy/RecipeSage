const API_BASE = "https://api.recipesage.com/";

chrome.runtime.onMessage.addListener((request) => {
  const clipData = request;
  console.log(clipData);

  saveClip(clipData);
});

let token;

const login = async () => {
  try {
    const loginResponse = await fetch(API_BASE + "users/login", {
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
    });

    if (!loginResponse.ok) {
      switch (loginResponse.status) {
        case 412:
          document.getElementById("message").innerText =
            "It looks like that email or password isn't correct.";
          break;
        default:
          document.getElementById("message").innerText =
            "Something went wrong. Please try again.";
          break;
      }
      return;
    }

    const data = await loginResponse.json();
    const { token } = data;

    chrome.storage.local.set({ token }, () => {
      chrome.storage.local.get(["seenTutorial"], (result) => {
        if (result.seenTutorial) {
          document.getElementById("message").innerText =
            "You are now logged in. Click the RecipeSage icon again to clip this website.";
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          showTutorial();
        }
      });
    });
  } catch (e) {
    document.getElementById("message").innerText =
      "Something went wrong. Please check your internet connection and try again.";
  }
};

const showTutorial = () => {
  document.getElementById("login").style.display = "none";
  document.getElementById("tutorial").style.display = "block";
  document.getElementById("importing").style.display = "none";
  document.getElementById("start").style.display = "none";
};

const showLoading = () => {
  document.getElementsByTagName("html")[0].style.display = "initial";
  document.getElementById("login").style.display = "none";
  document.getElementById("tutorial").style.display = "none";
  document.getElementById("importing").style.display = "block";
  document.getElementById("start").style.display = "none";
};

const showStart = () => {
  document.getElementsByTagName("html")[0].style.display = "initial";
  document.getElementById("login").style.display = "none";
  document.getElementById("tutorial").style.display = "none";
  document.getElementById("importing").style.display = "none";
  document.getElementById("start").style.display = "block";
};

const showLogin = () => {
  document.getElementsByTagName("html")[0].style.display = "initial";
  document.getElementById("login").style.display = "block";
  document.getElementById("tutorial").style.display = "none";
  document.getElementById("importing").style.display = "none";
  document.getElementById("start").style.display = "none";
};

const createImageFromBlob = async (imageBlob) => {
  const formData = new FormData();
  formData.append("image", imageBlob);

  const imageCreateResponse = await fetch(`${API_BASE}images?token=${token}`, {
    method: "POST",
    body: formData,
  });

  if (!imageCreateResponse.ok) return;

  const imageData = await imageCreateResponse.json();

  return imageData.id;
};

const interactiveClip = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["/inject/inject.js"],
  });

  window.close();
};

const autoClip = async () => {
  showLoading();

  try {
    await clipWithInject();
  } catch (e) {
    try {
      await clipWithAPI();
    } catch (e) {
      window.alert("Failed to fetch page content");
    }
  }
};

const clipWithInject = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["/inject/clip.js"],
  });
};

const clipWithAPI = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.documentElement.innerHTML,
  });

  const clipResponse = await fetch(`${API_BASE}clip?token=${token}`, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      html: result,
    }),
  });

  if (!clipResponse.ok) {
    return window.alert(
      "Failed to clip recipe. If this continues, please report a bug"
    );
  }

  const clipData = await clipResponse.json();

  await saveClip(clipData);
};

const saveClip = async (clipData) => {
  let imageId;
  if (clipData.imageBase64) {
    try {
      const response = await fetch(clipData.imageBase64);
      const blob = await response.blob();
      imageId = await createImageFromBlob(blob);
    } catch (e) {
      console.error(e);
    }
  }

  const recipeCreateResponse = await fetch(
    `${API_BASE}recipes?token=${token}`,
    {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...clipData,
        imageIds: imageId ? [imageId] : [],
      }),
    }
  );

  if (!recipeCreateResponse.ok) {
    switch (recipeCreateResponse.status) {
      case 401:
        chrome.storage.local.set({ token: null }, () => {
          window.alert(
            "Please Login. It looks like you're logged out. Please click the RecipeSage icon to login again."
          );
        });
        break;
      default:
        window.alert(
          "Could Not Save Recipe. An error occurred while saving the recipe. Please try again."
        );
        break;
    }
    return;
  }

  const recipeData = await recipeCreateResponse.json();

  const url = `https://recipesage.com/#/recipe/${recipeData.id}`;
  chrome.tabs.create({
    url,
    active: true,
  });

  setTimeout(() => {
    window.close();
  }, 500);
};

document.addEventListener("DOMContentLoaded", () => {
  [...document.getElementsByClassName("logo")].forEach(
    (logo) =>
      (logo.src = chrome.runtime.getURL(
        "./images/recipesage-black-trimmed.png"
      ))
  );
  document.getElementById("login-submit").onclick = login;
  document.getElementById("password").onkeydown = (event) => {
    if (event.key === "Enter") login();
  };
  document.getElementById("tutorial-submit").onclick = () => window.close();
  document.getElementById("auto-import").onclick = autoClip;
  document.getElementById("interactive-import").onclick = interactiveClip;

  chrome.storage.local.get(["token"], (result) => {
    token = result.token;

    document.getElementsByTagName("html")[0].style.display = "initial";

    if (token) {
      showStart();
    } else {
      showLogin();
    }
  });
});
