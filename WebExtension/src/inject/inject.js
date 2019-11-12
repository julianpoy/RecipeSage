var extensionContainerId = "recipeSageBrowserExtensionRootContainer";

if (window[extensionContainerId]) {
  // Looks like a popup already exists. Try to trigger it
  try {
    window.recipeSageBrowserExtensionRootTrigger();
  } catch(e) {}
} else {
  // At this point, we've determined that the popup does not exist

  window[extensionContainerId] = true; // Mark as loading so that we don't create duplicate popups

  console.log("Loading RecipeSage Browser Extension");

  // Grab our preferences
  chrome.storage.local.get(['enableAutoSnip'], preferences => {
    const softMatchElementsByClass = classname => {
      const classRegexp = new RegExp(`class="((\\w|\\s|-)*${classname}(\\w|\\s|-)*)"`);
      const matches = document.body.innerHTML.match(classRegexp);

      if (!matches) return [];
      return document.getElementsByClassName(matches[1]) || [];
    }

    const grabLongestMatchByClasses = classnames => {
      return classnames.reduce((acc, classname) => [...acc, ...softMatchElementsByClass(classname)], [])
        .map(element => element.innerText.trim())
        .reduce((max, match) => match.length > max.length ? match : max, '')
    }

    const cleanKnownWords = textBlock => {
      textBlock = textBlock.trim();

      const evilWords = new RegExp(`^(instructions|directions|procedure|you will need|ingredients|total time|active time|prep time|time|yield|servings|notes)`, 'gi');
      textBlock = textBlock.replace(evilWords, ''); // Remove words that will be duplicates of field names

      textBlock = textBlock.replace(/^\s*\d+:?\s*\n/g, ''); // Remove digits that sit on their own lines with no other content

      textBlock = textBlock.trim().replace(/^:/g, '').trim(); // Remove any hanging semicolons that we might have left

      textBlock = textBlock.replace(/^\s*\n/g, ''); // Remove any whitespace-only lines

      textBlock = textBlock.replace(/(^\s+)|(\s+$)/g, ''); // Trim leading and trailing spaces on each line

      return textBlock;
    }

    const capitalizeEachWord = textBlock => {
      return textBlock.split(' ').map(word => `${word.charAt(0).toUpperCase()}${word.substring(1)}`).join(' ');
    }

    const formatFuncs = {
      title:        val => capitalizeEachWord(val.trim().toLowerCase()),
      source:       val => val.trim(),
      yield:        val => capitalizeEachWord(cleanKnownWords(val).toLowerCase()),
      activeTime:   val => capitalizeEachWord(cleanKnownWords(val).toLowerCase()),
      totalTime:    val => capitalizeEachWord(cleanKnownWords(val).toLowerCase()),
      ingredients:  val => cleanKnownWords(val),
      instructions: val => cleanKnownWords(val),
      notes:        val => cleanKnownWords(val)
    };

    const autoSnipResults = {
      title: formatFuncs.title(grabLongestMatchByClasses(['recipe-title', 'post-title'] || document.title.split(/-|\|/)[0])),
      source: formatFuncs.source(document.title.split(/-|\|/)[1] || window.location.hostname.split('.').reverse()[1]),
      yield: formatFuncs.yield(grabLongestMatchByClasses(['yield', 'servings', 'serves'])),
      activeTime: formatFuncs.activeTime(grabLongestMatchByClasses(['activeTime', 'active-time', 'prep', 'prep-time', 'time-active', 'time-prep'])),
      totalTime: formatFuncs.totalTime(grabLongestMatchByClasses(['totalTime', 'total-time', 'time-total'])),
      ingredients: formatFuncs.ingredients(grabLongestMatchByClasses(['ingredients'])),
      instructions: formatFuncs.instructions(grabLongestMatchByClasses(['instructions'])),
      notes: formatFuncs.notes(grabLongestMatchByClasses(['notes']))
    };

    let snippersByField = {};

    let container;
    let currentSnip = {
      url: window.location.href
    };
    if (preferences.enableAutoSnip) currentSnip = { ...currentSnip, ...autoSnipResults }
    let isDirty = false;
    let imageURLInput;

    let fetchToken = (callback) => {
      chrome.storage.local.get(['token'], function (result) {
        callback(result.token);
      });
    }

    savePreferences = cb => {
      chrome.storage.local.set(preferences, cb);
    }

    let setField = (field, val) => {
      currentSnip[field] = val;
      isDirty = true;
    }

    let snip = (field, formatCb) => {
      var selectedText = window.getSelection().toString();
      if (formatCb) selectedText = formatCb(selectedText); // Allow for interstitial formatting
      setField(field, selectedText);
      return selectedText;
    }

    let hide = () => {
      isDirty = false;
      if (container) container.style.display = 'none';
    };

    let show = () => {
      if (!container) init();
      // Wait for DOM paint
      setTimeout(() => {
        container.style.display = 'block';
      });
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
      shadowRootContainer.id = extensionContainerId;
      let shadowRoot = shadowRootContainer.attachShadow({ mode: 'closed' })
      document.body.appendChild(shadowRootContainer);

      let styles = document.createElement('link');
      styles.href = chrome.extension.getURL('./src/inject/clipTool.css');
      styles.rel = 'stylesheet';
      styles.type = 'text/css';
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
      closeButton.innerText = 'CLOSE';
      closeButton.onclick = hide;
      closeButton.onmousedown = e => e.stopPropagation();
      closeButton.className = 'close clear';
      headline.appendChild(closeButton);

      let tipContainer = document.createElement('div');
      tipContainer.className = 'tip';
      tipContainer.onmousedown = e => e.stopPropagation();
      container.appendChild(tipContainer);

      let tipText = document.createElement('a');
      tipText.innerText = "Open Tutorial";
      tipText.href = "https://recipesage.com/#/tips-tricks-tutorials";
      tipText.target = "_blank";
      tipContainer.appendChild(tipText);

      let preferencesContainer = document.createElement('div');
      preferencesContainer.className = "preferences-container";
      tipContainer.appendChild(preferencesContainer);

      let autoSnipToggle = document.createElement('input');
      autoSnipToggle.className = "enable-autosnip";
      autoSnipToggle.checked = preferences.enableAutoSnip;
      autoSnipToggle.type = "checkbox";
      autoSnipToggle.onchange = e => {
        preferences.enableAutoSnip = autoSnipToggle.checked;
        savePreferences();
        displayAlert(
          'Preferences saved!',
          `Please reload the page for these changes to take effect`,
          4000
        );
      };
      preferencesContainer.appendChild(autoSnipToggle);

      let autoSnipToggleLabel = document.createElement('span');
      autoSnipToggleLabel.innerText = 'Enable Auto Field Detection';
      autoSnipToggleLabel.className = "enable-autosnip-label";
      preferencesContainer.appendChild(autoSnipToggleLabel);

      imageURLInput = createSnipper('Image URL', 'imageURL', false, "", true).input;
      createSnipper('Title', 'title', false, currentSnip.title);
      createSnipper('Description', 'description');
      createSnipper('Yield', 'yield', false, currentSnip.yield, false, );
      createSnipper('Active Time', 'activeTime', false, currentSnip.activeTime);
      createSnipper('Total Time', 'totalTime', false, currentSnip.totalTime);
      createSnipper('Source', 'source', false, currentSnip.source);
      createSnipper('Source URL', 'url', false, currentSnip.url, true);
      createSnipper('Ingredients', 'ingredients', true, currentSnip.ingredients);
      createSnipper('Instructions', 'instructions', true, currentSnip.instructions);
      createSnipper('Notes', 'notes', true, currentSnip.notes, true);

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

    let createSnipper = (title, field, isTextArea, initialValue, disableSnip, formatCb) => {
      let label = document.createElement('label');
      label.onmousedown = e => e.stopPropagation();
      container.appendChild(label);

      if (!disableSnip) {
        let button = document.createElement('button');
        button.className = 'icon-button';
        button.onclick = () => {
          input.value = snip(field, formatCb);
        };
        label.appendChild(button);

        let buttonIcon = document.createElement('i');
        buttonIcon.className = 'icon ion-md-cut';
        button.appendChild(buttonIcon);
      }

      let input = document.createElement(isTextArea ? 'textarea' : 'input');
      input.placeholder = title;
      if (initialValue) input.value = isTextArea ? initialValue : initialValue.replace(/\n/g, " ");
      input.oninput = () => { setField(field, input.value) };
      label.appendChild(input);

      let snipper = {
        input: input,
        label: label
      };

      snippersByField[field] = snipper;

      return snipper;
    }

    chrome.runtime.onMessage.addListener(function(request, sender) {
      if (request.action === "show") show();
      if (request.action === "hide") hide();
      if (request.action === "snipImage") {
        show();
        imageURLInput.value = request.event.srcUrl
        setField('imageURL', request.event.srcUrl);
      }
    });

    // =========== Alerts ============

    let alertShadowRootContainer, alertContainer;
    let initAlert = () => {
      alertShadowRootContainer = document.createElement('div');
      let shadowRoot = alertShadowRootContainer.attachShadow({ mode: 'closed' });
      document.body.appendChild(alertShadowRootContainer);

      let alertStyles = document.createElement('link');
      alertStyles.href = chrome.extension.getURL('./src/inject/alert.css');
      alertStyles.rel = 'stylesheet';
      alertStyles.type = 'text/css';
      shadowRoot.appendChild(alertStyles);

      alertContainer = document.createElement('div');
      alertContainer.className = 'alert'
      shadowRoot.appendChild(alertContainer);
    }

    destroyAlert = () => {
      if (alertShadowRootContainer) {
        document.body.removeChild(alertShadowRootContainer);
      }
      alertShadowRootContainer = null;
      alertContainer = null;
    }

    let alertTimeout;
    let displayAlert = (title, body, hideAfter, bodyLink) => {
      if (alertShadowRootContainer || alertContainer) destroyAlert();

      initAlert();

      let headline = document.createElement('div');
      headline.className = "headline";
      alertContainer.appendChild(headline);

      let alertImg = document.createElement('img');
      alertImg.src = chrome.extension.getURL('./icons/android-chrome-512x512.png');
      headline.appendChild(alertImg);

      let alertTitle = document.createElement('h3');
      alertTitle.innerText = title;
      headline.appendChild(alertTitle);

      let alertBody = document.createElement('span');
      if (!bodyLink) {
        alertBody.innerText = body;
      } else {
        let alertBodyLink = document.createElement('a');
        alertBodyLink.target = "_blank";
        alertBodyLink.href = bodyLink;
        alertBodyLink.innerText = body;
        alertBody.appendChild(alertBodyLink);
      }
      alertContainer.appendChild(alertBody);

      // Wait for DOM paint
      setTimeout(() => {
        alertContainer.style.display = 'block';

        if (alertTimeout) clearTimeout(alertTimeout);
        alertTimeout = setTimeout(() => {
          destroyAlert();
        }, hideAfter || 6000);
      });
    }

    let submit = () => {
      fetchToken(token => {
        return fetch(`https://rsdev.localhost/api/recipes?token=${token}`, {
          method: "POST",
          mode: "cors",
          cache: "no-cache",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(currentSnip)
        }).then(response => {
          if (response.ok) {
            response.json().then(data => {
              hide();
              displayAlert(
                `Recipe Saved!`,
                `Click to open`,
                4000,
                `https://rsdev.localhost/#/recipe/${data.id}`
              );
            });
          } else {
            switch (response.status) {
              case 401:
                chrome.storage.local.set({ token: null }, () => {
                  displayAlert(
                    'Please Login',
                    `It looks like you're logged out. Please click the RecipeSage icon to login again.`,
                    4000
                  );
                });
                break;
              case 412:
                displayAlert(
                  `Could Not Save Recipe`,
                  `A recipe title is required.`,
                  4000
                );
                break;
              case 415:
                displayAlert(
                  `Could Not Save Recipe`,
                  `We could not fetch the specified image URL. Please try another image URL, or try uploading the image after creating the recipe.`,
                  6000
                );
                break;
              default:
                displayAlert(
                  'Could Not Save Recipe',
                  'An error occurred while saving the recipe. Please try again.',
                  4000
                );
                break;
            }
          }
        }).catch(e => {
          displayAlert(
            'Could Not Save Recipe',
            'An error occurred while saving the recipe. Please try again.',
            4000
          );
          console.error(e);
        });
      });
    }

    window.recipeSageBrowserExtensionRootTrigger = show;
    show();
  });
}
