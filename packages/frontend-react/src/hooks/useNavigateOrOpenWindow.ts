import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";

export const useNavigateOrOpenWindow = () => {
  const router = useRouter();

  return useCallback(
    (href: string, event?: { metaKey: boolean; ctrlKey: boolean }) => {
      if (event && (event.metaKey || event.ctrlKey)) {
        window.open(`${import.meta.env.BASE_URL.replace(/\/$/, "")}${href}`);
        return;
      }
      void router.navigate({ href });
    },
    [router],
  );
};
