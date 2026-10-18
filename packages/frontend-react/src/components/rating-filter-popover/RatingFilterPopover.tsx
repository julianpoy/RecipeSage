import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Rating } from "../rating/Rating";

const POSSIBLE_RATINGS = [1, 2, 3, 4, 5];

export const RatingFilterPopover = ({
  ratingFilter,
  onApply,
}: {
  ratingFilter: (number | null)[];
  onApply: (ratingFilter: (number | null)[]) => void;
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<(number | null)[]>(() => [
    ...ratingFilter,
  ]);

  const toggle = (rating: number | null) => {
    setSelected((prev) =>
      prev.includes(rating)
        ? prev.filter((entry) => entry !== rating)
        : [...prev, rating],
    );
  };

  return (
    <div className="flex max-h-[80vh] min-h-0 flex-col">
      <h2 className="shrink-0 px-4 py-3 text-lg font-medium">
        {t("components.ratingFilter.title")}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <Label className="min-h-11 px-4 text-base font-normal">
          <Checkbox
            checked={selected.includes(null)}
            onCheckedChange={() => toggle(null)}
          />
          {t("components.ratingFilter.unrated")}
        </Label>
        {POSSIBLE_RATINGS.map((possibleRating) => (
          <Label
            key={possibleRating}
            className="min-h-11 px-4 text-base font-normal"
          >
            <Checkbox
              checked={selected.includes(possibleRating)}
              onCheckedChange={() => toggle(possibleRating)}
            />
            <Rating rating={possibleRating} className="text-[22px]" />
          </Label>
        ))}
      </div>
      <div className="flex shrink-0 justify-end gap-1 border-t px-2 py-2">
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => {
            setSelected([]);
            onApply([]);
          }}
        >
          {t("components.ratingFilter.reset")}
        </Button>
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => onApply([...selected])}
        >
          {t("generic.okay")}
        </Button>
      </div>
    </div>
  );
};
