const RecipeClipper = require("@julianpoy/recipe-clipper");

chrome.storage.local.get(["token"], async (result) => {
  window.RC_ML_CLASSIFY_ENDPOINT =
    "https://api.recipesage.com/proxy/ingredient-instruction-classifier?token=" +
    result.token;

  const clip = await RecipeClipper.clipRecipe().catch(() => {
    alert("Error while attempting to automatically clip recipe from page");
  });

  clip.url = window.location.href;

  if (clip.imageURL?.trim()) {
    try {
      const imageBlobResponse = await fetch(clip.imageURL);

      if (!imageBlobResponse.ok) return;

      const imageBlob = await imageBlobResponse.blob();

      clip.imageBase64 = await new Promise((success, error) => {
        try {
          const reader = new FileReader();
          reader.onload = function () {
            success(this.result);
          };
          reader.readAsDataURL(imageBlob);
        } catch (e) {
          error(e);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  chrome.runtime.sendMessage(clip);
});
