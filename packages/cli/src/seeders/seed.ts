import { initAssistantUser } from "./initAssistantUser";
import { seedExampleRecipeImages } from "./seedExampleRecipeImages";

export const seed = async () => {
  await initAssistantUser();
  await seedExampleRecipeImages();
};
