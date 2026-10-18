import { getRouteApi } from "@tanstack/react-router";
import { CookPage } from "./CookPage";

const routeApi = getRouteApi("/discover/$discoverRecipeId/cook");

export const DiscoverRecipeCookPage = () => {
  const { discoverRecipeId } = routeApi.useParams();

  return <CookPage recipeId={discoverRecipeId} isDiscover />;
};
