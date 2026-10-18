import { getRouteApi } from "@tanstack/react-router";
import { CookPage } from "./CookPage";

const routeApi = getRouteApi("/recipe/$recipeId/cook");

export const RecipeCookPage = () => {
  const { recipeId } = routeApi.useParams();

  return <CookPage recipeId={recipeId} isDiscover={false} />;
};
