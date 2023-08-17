const RecipeClipper = require("@julianpoy/recipe-clipper");

chrome.storage.local.get(["token"], async (result) => {
  window.RC_ML_CLASSIFY_ENDPOINT =
    "https://api.recipesage.com/proxy/ingredient-instruction-classifier?token=" +
    result.token;

  const clip = await RecipeClipper.clipRecipe().catch(() => {
    alert("Error while attempting to automatically clip recipe from page");
  });

  chrome.runtime.sendMessage(clip);
});
