let loggedInMessage = document.getElementById('loggedInMessage'), loggedOutMessage = document.getElementById('loggedOutMessage');
chrome.storage.local.get(['token'], function (result) {
  if (result.token) {
    fetch(`https://recipesage.com/api/users?token=${result.token}`).then(response => response.json())
      .then(response => {
        document.getElementById('loggedInEmail').innerText = response.email;
        loggedInMessage.style.display = 'block';
      }).catch(e => {
        switch (e.status) {
          case 401:
            alert('There was an error while fetching your account data.');
            break;
          default:
            loggedOutMessage.style.display = 'block';
            break;
        }
      });
  } else {
    loggedOutMessage.style.display = 'block';
  }
});

let logout = () => {
  chrome.storage.local.set({ token: null }, function () {
    loggedOutMessage.style.display = 'block';
    loggedInMessage.style.display = 'none';
  });
};

document.getElementById('logoutButton').onclick = logout;
