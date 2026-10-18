import { getRouteApi, useLocation } from "@tanstack/react-router";
import { AuthView } from "./AuthView";

const routeApi = getRouteApi("/auth/$authType");

export const AuthPage = () => {
  const { authType } = routeApi.useParams();
  const { redirect } = routeApi.useSearch();
  const showBack = useLocation({
    select: (location) => !!location.state.showBack,
  });

  return (
    <AuthView
      key={authType}
      startWithRegister={authType === "register"}
      redirect={redirect}
      showBack={showBack}
    />
  );
};
