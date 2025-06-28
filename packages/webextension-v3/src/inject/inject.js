import { clipRecipe } from "@julianpoy/recipe-clipper/dist/recipe-clipper.mjs";
const extensionContainerId = "recipeSageBrowserExtensionRootContainer";

if (window[extensionContainerId]) {
  // Looks like a popup already exists. Try to trigger it
  try {
    window.recipeSageBrowserExtensionRootTrigger();
  } catch (_e) {
    // Do nothing
  }
} else {
  // At this point, we've determined that the popup does not exist

  window[extensionContainerId] = true; // Mark as loading so that we don't create duplicate popups

  console.log("Loading RecipeSage Browser Extension");

  const fetchToken = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(["token"], (result) => {
        resolve(result.token);
      });
    });
  };

  const shadowRootContainer = document.createElement("div");
  shadowRootContainer.id = extensionContainerId;
  const shadowRoot = shadowRootContainer.attachShadow({ mode: "closed" });
  document.body.appendChild(shadowRootContainer);

  const styles = document.createElement("link");
  styles.href = chrome.runtime.getURL("inject/clipTool.css");
  styles.rel = "stylesheet";
  styles.type = "text/css";
  shadowRoot.appendChild(styles);

  const ionIcons = document.createElement("link");
  ionIcons.href = "https://unpkg.com/ionicons@4.5.5/dist/css/ionicons.min.css";
  ionIcons.rel = "stylesheet";
  ionIcons.type = "text/css";
  document.head.appendChild(ionIcons);
  shadowRoot.appendChild(ionIcons.cloneNode());

  // Grab our preferences
  chrome.storage.local.get(["disableAutoSnip"], (preferences) => {
    let autoSnipPendingContainer;
    let autoSnipPromise = Promise.resolve();
    if (!preferences.disableAutoSnip) {
      autoSnipPendingContainer = document.createElement("div");
      autoSnipPendingContainer.className = "rs-autoSnipPendingContainer";
      shadowRoot.appendChild(autoSnipPendingContainer);

      const autoSnipPending = document.createElement("div");
      autoSnipPending.className = "autoSnipPending";
      autoSnipPending.innerText = "Grabbing Recipe Content...";
      autoSnipPendingContainer.appendChild(autoSnipPending);

      autoSnipPromise = fetchToken().then((token) => {
        window.RC_ML_CLASSIFY_ENDPOINT =
          "https://api.recipesage.com/proxy/ingredient-instruction-classifier?token=" +
          token;

        return clipRecipe().catch(() => {
          alert(
            "Error while attempting to automatically clip recipe from page",
          );
        });
      });
    }

    autoSnipPromise.then((autoSnipResults) => {
      autoSnipResults = autoSnipResults || {};

      if (autoSnipPendingContainer) {
        setTimeout(() => {
          // Timeout so that overlay doesn't flash in the case of instant (local only) autosnip
          shadowRoot.removeChild(autoSnipPendingContainer);
        }, 250);
      }

      const snippersByField = {};

      let container;
      let currentSnip = {
        url: window.location.href,
      };
      if (!preferences.disableAutoSnip)
        currentSnip = { ...currentSnip, ...autoSnipResults };
      let isDirty = false;
      let imageURLInput;

      const savePreferences = (cb) => {
        chrome.storage.local.set(preferences, cb);
      };

      const setField = (field, val) => {
        currentSnip[field] = val;
        isDirty = true;
      };

      const snip = (field, formatCb) => {
        let selectedText = window.getSelection().toString();
        if (formatCb) selectedText = formatCb(selectedText); // Allow for interstitial formatting
        setField(field, selectedText);
        return selectedText;
      };

      const hide = () => {
        isDirty = false;
        if (container) container.style.display = "none";
      };

      const show = () => {
        if (!container) init();
        // Wait for DOM paint
        setTimeout(() => {
          container.style.display = "block";
        });
      };

      const moveTo = (top, left) => {
        if (left < 0) {
          container.style.left = "0px";
        } else if (left + container.offsetWidth > window.innerWidth) {
          container.style.left = `${
            window.innerWidth - container.offsetWidth
          }px`;
        } else {
          container.style.left = `${left}px`;
        }

        if (top < 0) {
          container.style.top = "0px";
        } else if (top + container.offsetHeight > window.innerHeight) {
          container.style.top = `${
            window.innerHeight - container.offsetHeight
          }px`;
        } else {
          container.style.top = `${top}px`;
        }
      };

      const pos = {};
      const moveDrag = (e) => {
        const diffX = e.clientX - pos.lastX;
        const diffY = e.clientY - pos.lastY;

        moveTo(container.offsetTop + diffY, container.offsetLeft + diffX);

        pos.lastX = e.clientX;
        pos.lastY = e.clientY;
      };

      const stopDrag = () => {
        window.removeEventListener("mouseup", stopDrag);
        window.removeEventListener("mousemove", moveDrag);
      };

      const startDrag = (e) => {
        window.addEventListener("mouseup", stopDrag);
        window.addEventListener("mousemove", moveDrag);
        pos.lastX = e.clientX;
        pos.lastY = e.clientY;
      };

      const init = () => {
        container = document.createElement("div");
        container.className = "rs-chrome-container";
        container.style.display = "none";
        container.onmousedown = startDrag;
        window.onresize = () =>
          moveTo(container.offsetTop, container.offsetLeft);
        shadowRoot.appendChild(container);

        const headline = document.createElement("div");
        headline.className = "headline";
        container.appendChild(headline);

        const leftHeadline = document.createElement("div");
        leftHeadline.className = "headline-left";
        headline.appendChild(leftHeadline);

        const moveButton = document.createElement("i");
        moveButton.className = "icon ion-md-move";
        leftHeadline.appendChild(moveButton);

        const logoLink = document.createElement("a");
        logoLink.href = "https://recipesage.com";
        logoLink.target = "_blank";
        logoLink.onmousedown = (e) => e.stopPropagation();
        leftHeadline.appendChild(logoLink);

        const logo = document.createElement("img");
        logo.src = chrome.runtime.getURL("images/recipesage-black-trimmed.png");
        logo.className = "logo";
        logo.draggable = false;
        logoLink.appendChild(logo);

        const closeButton = document.createElement("button");
        closeButton.innerText = "CLOSE";
        closeButton.onclick = hide;
        closeButton.onmousedown = (e) => e.stopPropagation();
        closeButton.className = "close clear";
        headline.appendChild(closeButton);

        const tipContainer = document.createElement("div");
        tipContainer.className = "tip";
        tipContainer.onmousedown = (e) => e.stopPropagation();
        container.appendChild(tipContainer);

        const tipText = document.createElement("a");
        tipText.innerText = "Open Tutorial";
        tipText.href = "https://docs.recipesage.com";
        tipText.target = "_blank";
        tipContainer.appendChild(tipText);

        const preferencesContainer = document.createElement("div");
        preferencesContainer.className = "preferences-container";
        tipContainer.appendChild(preferencesContainer);

        const autoSnipToggle = document.createElement("input");
        autoSnipToggle.className = "enable-autosnip";
        autoSnipToggle.checked = !preferences.disableAutoSnip;
        autoSnipToggle.type = "checkbox";
        autoSnipToggle.onchange = () => {
          preferences.disableAutoSnip = !autoSnipToggle.checked;
          savePreferences();
          displayAlert(
            "Preferences saved!",
            `Please reload the page for these changes to take effect`,
            4000,
          );
        };
        preferencesContainer.appendChild(autoSnipToggle);

        const autoSnipToggleLabel = document.createElement("span");
        autoSnipToggleLabel.innerText = "Enable Auto Field Detection";
        autoSnipToggleLabel.className = "enable-autosnip-label";
        preferencesContainer.appendChild(autoSnipToggleLabel);

        imageURLInput = createSnipper(
          "Image URL",
          "imageURL",
          false,
          currentSnip.imageURL,
          true,
        ).input;
        createSnipper("Title", "title", false, currentSnip.title);
        createSnipper(
          "Description",
          "description",
          false,
          currentSnip.description,
          false,
        );
        createSnipper("Yield", "yield", false, currentSnip.yield, false);
        createSnipper(
          "Active Time",
          "activeTime",
          false,
          currentSnip.activeTime,
        );
        createSnipper("Total Time", "totalTime", false, currentSnip.totalTime);
        createSnipper("Source", "source", false, currentSnip.source);
        createSnipper("Source URL", "url", false, currentSnip.url, true);
        createSnipper(
          "Ingredients",
          "ingredients",
          true,
          currentSnip.ingredients,
        );
        createSnipper(
          "Instructions",
          "instructions",
          true,
          currentSnip.instructions,
        );
        createSnipper("Notes", "notes", true, currentSnip.notes);

        const save = document.createElement("button");
        save.innerText = "Save";
        save.onclick = submit;
        save.onmousedown = (e) => e.stopPropagation();
        save.className = "save";
        container.appendChild(save);

        window.addEventListener("beforeunload", function (e) {
          if (!isDirty) return undefined;

          const confirmationMessage = `You've made changes in the RecipeSage editor.
          If you leave before saving, your changes will be lost.`;

          (e || window.event).returnValue = confirmationMessage; //Gecko + IE
          return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
        });
      };

      const createSnipper = (
        title,
        field,
        isTextArea,
        initialValue,
        disableSnip,
        formatCb,
      ) => {
        const label = document.createElement("label");
        label.onmousedown = (e) => e.stopPropagation();
        container.appendChild(label);

        if (!disableSnip) {
          const button = document.createElement("button");
          button.className = "icon-button";
          button.onclick = () => {
            input.value = snip(field, formatCb);
          };
          label.appendChild(button);

          const buttonIcon = document.createElement("i");
          buttonIcon.className = "icon ion-md-cut";
          button.appendChild(buttonIcon);
        }

        const input = document.createElement(isTextArea ? "textarea" : "input");
        input.placeholder = title;
        if (initialValue)
          input.value = isTextArea
            ? initialValue
            : initialValue.replace(/\n/g, " ");
        input.oninput = () => {
          setField(field, input.value);
        };
        label.appendChild(input);

        const snipper = {
          input: input,
          label: label,
        };

        snippersByField[field] = snipper;

        return snipper;
      };

      chrome.runtime.onMessage.addListener(function (request) {
        if (request.action === "show") show();
        if (request.action === "hide") hide();
        if (request.action === "snipImage") {
          show();
          imageURLInput.value = request.event.srcUrl;
          setField("imageURL", request.event.srcUrl);
        }
      });

      // =========== Alerts ============

      let alertShadowRootContainer, alertContainer;
      const initAlert = () => {
        alertShadowRootContainer = document.createElement("div");
        const shadowRoot = alertShadowRootContainer.attachShadow({
          mode: "closed",
        });
        document.body.appendChild(alertShadowRootContainer);

        const alertStyles = document.createElement("link");
        alertStyles.href = chrome.runtime.getURL("inject/alert.css");
        alertStyles.rel = "stylesheet";
        alertStyles.type = "text/css";
        shadowRoot.appendChild(alertStyles);

        alertContainer = document.createElement("div");
        alertContainer.className = "alert";
        shadowRoot.appendChild(alertContainer);
      };

      const destroyAlert = () => {
        if (alertShadowRootContainer) {
          document.body.removeChild(alertShadowRootContainer);
        }
        alertShadowRootContainer = null;
        alertContainer = null;
      };

      let alertTimeout;
      const displayAlert = (title, body, hideAfter, bodyLink) => {
        if (alertShadowRootContainer || alertContainer) destroyAlert();

        initAlert();

        const headline = document.createElement("div");
        headline.className = "headline";
        alertContainer.appendChild(headline);

        const alertImg = document.createElement("img");
        alertImg.src = chrome.runtime.getURL(
          "icons/android-chrome-512x512.png",
        );
        headline.appendChild(alertImg);

        const alertTitle = document.createElement("h3");
        alertTitle.innerText = title;
        headline.appendChild(alertTitle);

        const alertBody = document.createElement("span");
        if (!bodyLink) {
          alertBody.innerText = body;
        } else {
          const alertBodyLink = document.createElement("a");
          alertBodyLink.target = "_blank";
          alertBodyLink.href = bodyLink;
          alertBodyLink.innerText = body;
          alertBody.appendChild(alertBodyLink);
        }
        alertContainer.appendChild(alertBody);

        // Wait for DOM paint
        setTimeout(() => {
          alertContainer.style.display = "block";

          if (alertTimeout) clearTimeout(alertTimeout);
          alertTimeout = setTimeout(() => {
            destroyAlert();
          }, hideAfter || 6000);
        });
      };

      const submit = async () => {
        try {
          const token = await fetchToken();

          let imageId;
          if (currentSnip.imageURL?.trim().length) {
            try {
              const imageResponse = await fetch(currentSnip.imageURL);
              const imageBlob = await imageResponse.blob();

              const formData = new FormData();
              formData.append("image", imageBlob);

              const imageCreateResponse = await fetch(
                `https://api.recipesage.com/images?token=${token}`,
                {
                  method: "POST",
                  body: formData,
                },
              );

              if (imageCreateResponse.ok) {
                const imageData = await imageCreateResponse.json();
                imageId = imageData.id;
              }
            } catch (e) {
              console.error("Error creating image", e);
            }
          }

          const recipeCreateResponse = await fetch(
            `https://api.recipesage.com/recipes?token=${token}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...currentSnip,
                imageIds: imageId ? [imageId] : [],
              }),
            },
          );

          if (recipeCreateResponse.ok) {
            recipeCreateResponse.json().then((data) => {
              hide();
              displayAlert(
                `Recipe Saved!`,
                `Click to open`,
                4000,
                `https://recipesage.com/#/recipe/${data.id}`,
              );
            });
          } else {
            switch (recipeCreateResponse.status) {
              case 401:
                chrome.storage.local.set({ token: null }, () => {
                  displayAlert(
                    "Please Login",
                    `It looks like you're logged out. Please click the RecipeSage icon to login again.`,
                    4000,
                  );
                });
                break;
              case 412:
                displayAlert(
                  `Could Not Save Recipe`,
                  `A recipe title is required.`,
                  4000,
                );
                break;
              case 415:
                displayAlert(
                  `Could Not Save Recipe`,
                  `We could not fetch the specified image URL. Please try another image URL, or try uploading the image after creating the recipe.`,
                  6000,
                );
                break;
              default:
                displayAlert(
                  "Could Not Save Recipe",
                  "An error occurred while saving the recipe. Please try again.",
                  4000,
                );
                break;
            }
          }
        } catch (e) {
          displayAlert(
            "Could Not Save Recipe",
            "An error occurred while saving the recipe. Please try again.",
            4000,
          );
          console.error(e);
        }
      };

      window.recipeSageBrowserExtensionRootTrigger = show;
      show();
    });
  });
}
