import { StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const STAR_COUNT = 5;

export const Rating = ({
  rating,
  enableEdit = false,
  onRatingChange,
  className,
}: {
  rating?: number | null;
  enableEdit?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const filledStarCount = Math.min(Math.max(rating || 0, 0), STAR_COUNT);

  const setRating = (newRating: number) => {
    if (!enableEdit) return;
    onRatingChange?.(newRating === (rating || 0) ? 0 : newRating);
  };

  const stars = Array.from(
    { length: STAR_COUNT },
    (_, idx) => idx < filledStarCount,
  );

  if (!enableEdit) {
    return (
      <span
        role="img"
        aria-label={t("components.rating.label", { rating: filledStarCount })}
        className={cn("inline-flex align-middle", className)}
      >
        {stars.map((filled, idx) => (
          <StarIcon
            key={idx}
            aria-hidden="true"
            className={cn("me-0.5 size-[1em]", filled && "fill-current")}
          />
        ))}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex align-middle", className)}>
      {stars.map((filled, idx) => (
        <button
          key={idx}
          type="button"
          aria-label={t("components.rating.label", { rating: idx + 1 })}
          aria-pressed={idx + 1 === filledStarCount}
          className="me-0.5 inline-flex cursor-pointer rounded-sm transition-[transform,opacity] duration-100 outline-none hover:scale-115 hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/30"
          onClick={() => setRating(idx + 1)}
        >
          <StarIcon
            aria-hidden="true"
            className={cn("size-[1em]", filled && "fill-current")}
          />
        </button>
      ))}
    </span>
  );
};
