const loggedInView = document.getElementById("loggedInView");
const loggedOutView = document.getElementById("loggedOutView");

chrome.storage.local.get(["token", "api_url", "base_url"], async (result) => {
  if (result.token) {
    try {
      const response = await fetch(
        `${result.api_url}users?token=${result.token}`,
      );
      const data = await response.json();
      document.getElementById("loggedInEmail").innerText = data.email;
      document.getElementById("loggedInServer").innerText = result.api_url;
      document.getElementById("baseUrl").value = result.base_url;
      document.getElementById("apiUrl").value = result.api_url;
      loggedInView.style.display = "block";
    } catch (e) {
      switch (e.status) {
        case 401:
          alert("There was an error while fetching your account data.");
          break;
        default:
          loggedOutView.style.display = "block";
          break;
      }
    }
  } else {
    loggedOutView.style.display = "block";
  }
});

const logout = () => {
  chrome.storage.local.set(
    { token: null, api_url: null, base_url: null },
    () => {
      loggedOutView.style.display = "block";
      loggedInView.style.display = "none";
    },
  );
};

const updateServerDetails = () => {
  const base_url = document.getElementById("baseUrl").value;
  chrome.storage.local.set({ base_url }, () => {
    document.getElementById("message").innerText =
      "Your server details have been updated.";
    setTimeout(() => {
      document.getElementById("message").innerText = "";
    }, 3000);
  });
};

document.getElementById("logoutButton").onclick = logout;
document.getElementById("serverDetailsUpdate").onclick = updateServerDetails;
