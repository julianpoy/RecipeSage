let token;

let login = () => {
  return fetch("https://recipesage.com/api/users/login", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    referrer: "no-referrer",
    body: JSON.stringify({
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    })
  }).then(response => {
    if (response.ok) {
      response.json().then(data => {
        // Save the token
        chrome.storage.local.set({ token: data.token }, () => {
          token = data.token;
    
          document.getElementById('message').innerText = 'You are now logged in. Launching the snip tool...';
          setTimeout(() => {
            launch();
          }, 2000);
        });
      });
    } else {
      switch (response.status) {
        case 412:
          document.getElementById('message').innerText = 'It looks like that email or password isn\'t correct.';
          break;
        default:
          document.getElementById('message').innerText = 'Something went wrong. Please try again.';
          break;
      }
    }
  }).catch(e => {
    document.getElementById('message').innerText = 'Something went wrong. Please check your internet connection and try again.';
  });
}

let launch = () => {
  newClip();
  window.close();
}

let newClip = () => {
  chrome.tabs.executeScript({
    code: 'hide();show();'
  });
}

chrome.storage.local.get(['token'], result => {
  token = result.token;

  // If user is logged in, launch the tool
  if (token) launch();
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-submit').onclick = login;
});
