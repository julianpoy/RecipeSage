const loggedInMessage = document.getElementById("loggedInMessage");
const loggedOutMessage = document.getElementById("loggedOutMessage");

chrome.storage.local.get(["token", "api_base"], async (result) => {
  if (result.token) {
    try {
      const response = await fetch(
        `${result.api_base}users?token=${result.token}`,
      );
      const data = await response.json();
      document.getElementById("loggedInEmail").innerText = data.email;
      document.getElementById("loggedInServer").innerText = result.api_base;
      loggedInMessage.style.display = "block";
    } catch (e) {
      switch (e.status) {
        case 401:
          alert("There was an error while fetching your account data.");
          break;
        default:
          loggedOutMessage.style.display = "block";
          break;
      }
    }
  } else {
    loggedOutMessage.style.display = "block";
  }
});

const logout = () => {
  chrome.storage.local.set({ token: null, api_base: null }, () => {
    loggedOutMessage.style.display = "block";
    loggedInMessage.style.display = "none";
  });
};

document.getElementById("logoutButton").onclick = logout;
