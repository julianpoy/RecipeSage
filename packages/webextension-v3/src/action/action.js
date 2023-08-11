const API_BASE = "https://api.recipesage.com/";

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
          tutorial();
        }
      });
    });
  } catch (e) {
    document.getElementById("message").innerText =
      "Something went wrong. Please check your internet connection and try again.";
  }
};

const tutorial = () => {
  document.getElementById("login").style.display = "none";
  document.getElementById("tutorial").style.display = "block";
  document.getElementById("importing").style.display = "none";
};

const loading = () => {
  document.getElementsByTagName("html")[0].style.display = "initial";
  document.getElementById("login").style.display = "none";
  document.getElementById("tutorial").style.display = "none";
  document.getElementById("importing").style.display = "block";
};

const launch = (token) => {
  newClip(token);
};

const fetchAndCreateImage = async (imageURL) => {
  const imageBlobResponse = await fetch(imageURL);

  if (!imageBlobResponse.ok) return;

  const imageBlob = await imageBlobResponse.blob();
  const formData = new FormData();
  formData.append("image", imageBlob, "image");

  const imageCreateResponse = await fetch(`${API_BASE}images?token=${token}`, {
    method: "POST",
    body: formData,
  });

  if (!imageCreateResponse.ok) return;

  const imageData = await imageCreateResponse.json();

  return imageData.id;
};

const newClip = async () => {
  loading();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let result;
  try {
    [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.innerHTML,
    });
  } catch (e) {
    console.error(e);
    window.alert("Failed to fetch page content");
    return;
  }

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

  const imageId = clipData.imageURL?.trim()
    ? await fetchAndCreateImage(clipData.imageURL)
    : undefined;

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

const tokenFetchPromise = new Promise((resolve, reject) => {
  chrome.storage.local.get(["token"], (result) => {
    token = result.token;

    // If user is logged in, launch the tool
    if (token) {
      launch(token);
      reject();
    } else {
      resolve();
    }
  });
});

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

  tokenFetchPromise
    .then(() => {
      document.getElementsByTagName("html")[0].style.display = "initial";
    })
    .catch(() => {
      // Do nothing
    });
});
