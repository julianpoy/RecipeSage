let pluginWidth = '300px';

let styles = document.createElement('style');
styles.innerHTML = `
:host {
  all: initial !important;
  contain: content;
}

.rs-chrome-container {
  position: fixed;
  right: 10px;
  top: 20%;
  width: ${pluginWidth};
  padding: 10px;

  z-index: 99999999999999999999999999;
  background: white;
  box-shadow: 1px 1px 12px #666666;

  user-select: none;

  font-size: 14px;
}

label {
  display: flex;
}

input, textarea {
  min-width: 0;
  flex-grow: 1;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(0,0,0,0.1);
  padding: 10px;
  transition: 0.3s;
  background: transparent;
  color: initial;
  font-family: unset;
}

input:focus, textarea:focus {
  border-bottom: 1px solid #00a8ff;
  outline: none;
}

button {
  height: 32px;
  padding: 0 11px;
  margin: 4px;

  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  
  background: #00a8ff;
  color: white;
  cursor: pointer;
  
  border: none;
  border-radius: 2px;
  box-shadow: 0 2px 2px 0 rgba(0,0,0,.14), 0 3px 1px -2px rgba(0,0,0,.2), 0 1px 5px 0 rgba(0,0,0,.12);
}

button.icon-button {
  padding: 0 8px;
}

button.clear {
  background: none;
  box-shadow: none;
  color: #00a8ff;
}

button i {
  font-size: 16px;
  vertical-align: bottom;
}

.logo {
  height: 35px;
}

.tip {
  margin-top: 8px;
  margin-bottom: 16px;
  text-align: center;
  font-size: 12px;
}

.headline {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.headline-left {
  display: flex;
  align-self: flex-start;
}

.headline-left > .ion-md-move {
  margin-right: 5px;
  cursor: grab;
}

.save {
  width: 100%;
  margin: 10px 0 0;
}
`;

console.log("Loading RecipeSage Browser Extension");

let container, currentSnip = {}, isDirty = false;

let fetchToken = (callback) => {
  chrome.storage.local.get(['token'], function (result) {
    callback(result.token);
  });
}

let setField = (field, val) => {
  currentSnip[field] = val;
  isDirty = true;
}

let snip = (field) => {
  var selectedText = window.getSelection().toString();
  setField(field, selectedText);
  return selectedText;
}

let hide = () => {
  isDirty = false;
  if (container) container.style.display = 'none';
};

let show = () => {
  if (!container) init();
  container.style.display = 'block';
};

let moveTo = (top, left) => {
  if (left < 0) {
    container.style.left = '0px';
  } else if ((left + container.offsetWidth) > window.innerWidth) {
    container.style.left = `${window.innerWidth - container.offsetWidth}px`;
  } else {
    container.style.left = `${left}px`;
  }

  if (top < 0) {
    container.style.top = '0px';
  } else if ((top + container.offsetHeight) > window.innerHeight) {
    container.style.top = `${window.innerHeight - container.offsetHeight}px`;
  } else {
    container.style.top = `${top}px`;
  }
}

let pos = {};
let moveDrag = e => {
  let diffX = e.clientX - pos.lastX;
  let diffY = e.clientY - pos.lastY;

  moveTo(container.offsetTop + diffY, container.offsetLeft + diffX);

  pos.lastX = e.clientX;
  pos.lastY = e.clientY;
}

let stopDrag = () => {
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('mousemove', moveDrag);
}

let startDrag = e => {
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('mousemove', moveDrag);
  pos.lastX = e.clientX;
  pos.lastY = e.clientY;
}

let init = () => {
  let shadowRootContainer = document.createElement('div')
  let shadowRoot = shadowRootContainer.attachShadow({ mode: 'closed' })
  document.body.appendChild(shadowRootContainer);

  shadowRoot.appendChild(styles);

  
  let ionIcons = document.createElement('link');
  ionIcons.href = 'https://unpkg.com/ionicons@4.5.5/dist/css/ionicons.min.css';
  ionIcons.rel = 'stylesheet';
  ionIcons.type = 'text/css';
  document.head.appendChild(ionIcons);
  shadowRoot.appendChild(ionIcons.cloneNode());

  container = document.createElement('div')
  container.className = 'rs-chrome-container';
  container.style.display = 'none';
  container.onmousedown = startDrag;
  window.onresize = () => moveTo(container.offsetTop, container.offsetLeft);
  shadowRoot.appendChild(container);

  let headline = document.createElement('div');
  headline.className = 'headline';
  container.appendChild(headline);

  let leftHeadline = document.createElement('div');
  leftHeadline.className = 'headline-left';
  headline.appendChild(leftHeadline);

  let moveButton = document.createElement('i');
  moveButton.className = 'icon ion-md-move';
  leftHeadline.appendChild(moveButton);

  let logoLink = document.createElement('a');
  logoLink.href = 'https://recipesage.com';
  logoLink.onmousedown = e => e.stopPropagation();
  leftHeadline.appendChild(logoLink);

  let logo = document.createElement('img');
  logo.src = chrome.extension.getURL('./images/recipesage-black-trimmed.png');
  logo.className = 'logo';
  logo.draggable = false;
  logoLink.appendChild(logo);

  let closeButton = document.createElement('button');
  // closeButton.innerHTML = "<i class='icon ion-md-close'></i>";
  closeButton.innerText = 'CLOSE';
  closeButton.onclick = hide;
  closeButton.onmousedown = e => e.stopPropagation();
  closeButton.className = 'close clear';
  headline.appendChild(closeButton);

  let tipText = document.createElement('div');
  tipText.innerText = "Select some text and press the scissors button next to the field you wish to fill.";
  tipText.className = 'tip';
  container.appendChild(tipText);

  createSnipper('Title', 'title');
  createSnipper('Description', 'description');
  createSnipper('Yield', 'yield');
  createSnipper('Active Time', 'activeTime');
  createSnipper('Total Time', 'totalTime');
  createSnipper('Source', 'source');
  createSnipper('Source URL', 'sourceURL', false, window.location.href, true);
  createSnipper('Ingredients', 'ingredients', true);
  createSnipper('Instructions', 'instructions', true);
  createSnipper('Notes', 'notes', true);

  let save = document.createElement('button');
  save.innerText = "Save";
  save.onclick = submit;
  save.onmousedown = e => e.stopPropagation();
  save.className = 'save';
  container.appendChild(save);

  window.addEventListener("beforeunload", function (e) {
    if (!isDirty) return undefined;

    var confirmationMessage = `You've made changes in the RecipeSage editor.
    If you leave before saving, your changes will be lost.`;

    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
  });
}

let createSnipper = (title, field, isTextArea, initialValue, disableSnip) => {
  let label = document.createElement('label');
  label.onmousedown = e => e.stopPropagation();
  container.appendChild(label);

  if (!disableSnip) {
    let button = document.createElement('button');
    button.className = 'icon-button';
    button.onclick = () => {
      input.value = snip(field);
    };
    label.appendChild(button);
  
    let buttonIcon = document.createElement('i');
    buttonIcon.className = 'icon ion-md-cut';
    button.appendChild(buttonIcon);
  }

  let input = document.createElement(isTextArea ? 'textarea' : 'input');
  input.placeholder = title;
  if (initialValue) input.value = initialValue;
  input.onchange = () => { setField(field, input.value) };
  label.appendChild(input);
}

let alertContainer;
let initAlert = () => {
  let shadowRootContainer = document.createElement('div')
  let shadowRoot = shadowRootContainer.attachShadow({ mode: 'closed' })
  document.body.appendChild(shadowRootContainer);

  let alertStyles = document.createElement('style');
  alertStyles.innerHTML = `
    :host {
      all: initial !important;
      contain: content;
    }

    .alert {
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: ${pluginWidth};
      padding: 20px;

      z-index: 99999999999999999999999999;
      background: white;
      box-shadow: 1px 1px 12px #666666;

      user-select: none;

      font-size: 16px;
    }

    .headline {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }

    img {
      width: 30px;
      height: 30px;
      border-radius: 20px;
    }

    h3 {
      margin: 0 10px;
      font-size: 18.5px;
    }
  </style>`;
  shadowRoot.appendChild(alertStyles);

  alertContainer = document.createElement('div');
  alertContainer.className = 'alert'
  shadowRoot.appendChild(alertContainer);
}

let alertTimeout;
let displayAlert = (innerHTML, hideAfter) => {
  if (!alertContainer) initAlert();
  alertContainer.innerHTML = innerHTML;
  alertContainer.style.display = 'block';

  if (alertTimeout) clearTimeout(alertTimeout);
  alertTimeout = setTimeout(() => {
    alertContainer.style.display = 'none';
  }, hideAfter || 6000);
}

let buildAlert = (header, body) => {
  return `
    <div class="headline">
      <img src="${chrome.extension.getURL('./icons/android-chrome-512x512.png')}" />
      <h3>${header}</h3>
    </div>
    <span>${body}</span>
  `;
}

let submit = () => {
  fetchToken(token => {
    return fetch(`https://recipesage.com/api/recipes?token=${token}`, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      referrer: "no-referrer",
      body: JSON.stringify(currentSnip)
    }).then(response => {
      if (response.ok) {
        response.json().then(data => {
          hide();
          displayAlert(`<h3>Recipe Saved!</h3>
          <span>
            <a href="https://recipesage.com/#/recipes/${response.id}" target="_blank">Click to open</a>
          </span>`, 4000);
        });
      } else {
        switch (response.status) {
          case 401:
            chrome.storage.local.set({ token: null }, () => {
              displayAlert(
                buildAlert('Please Login', `It looks like you're logged out. Please click the RecipeSage icon to login again.`),
                4000
              );
            });
            break;
          case 412:
            displayAlert(
              buildAlert(`Could Not Save Recipe`, `A recipe title is required.`),
              4000
            );
            break;
          default:
            displayAlert(
              buildAlert('Could Not Save Recipe', 'An error occurred while saving the recipe. Please try again.'),
              4000
            );
            break;
        }
      }
    }).catch(e => {
      displayAlert(
        buildAlert('Could Not Save Recipe', 'An error occurred while saving the recipe. Please try again.'),
        4000
      );
    });
  });
}
