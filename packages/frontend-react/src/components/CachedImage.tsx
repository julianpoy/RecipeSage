import { useEffect, useState, type ComponentProps } from "react";
import { imageCacheService } from "../services/imageCacheService";
import { resolveStorageLocation } from "../utils/resolveStorageLocation";

export const CachedImage = ({
  src,
  alt = "",
  ...imgProps
}: Omit<ComponentProps<"img">, "src" | "onError"> & {
  src?: string | null;
}) => {
  const url = src ? resolveStorageLocation(src) : undefined;
  const [cachedFallback, setCachedFallback] = useState<{
    url: string;
    src: string;
  }>();

  useEffect(() => {
    if (url) void imageCacheService.prime(url);
  }, [url]);

  const effectiveSrc =
    url && cachedFallback?.url === url ? cachedFallback.src : url;

  return (
    <img
      {...imgProps}
      alt={alt}
      src={effectiveSrc}
      onError={() => {
        if (!url || cachedFallback?.url === url) return;
        void imageCacheService.resolveCached(url).then((cached) => {
          if (cached) setCachedFallback({ url, src: cached });
        });
      }}
    />
  );
};
