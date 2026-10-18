import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CachedImage } from "../../../components/CachedImage";
import { RecipeSectionTitle } from "./RecipeSectionTitle";

export interface RecipeLinkListEntry {
  id: string;
  title: string;
  imageLocation?: string;
}

export const RecipeLinkList = ({
  icon,
  title,
  recipes,
}: {
  icon: ReactNode;
  title: ReactNode;
  recipes: RecipeLinkListEntry[];
}) => (
  <div className="my-4">
    <RecipeSectionTitle icon={icon}>{title}</RecipeSectionTitle>
    <ul>
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link
            to="/recipe/$recipeId"
            params={{ recipeId: recipe.id }}
            className="flex min-h-12 items-center gap-4 rounded-xl px-4 py-1.5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            {recipe.imageLocation ? (
              <CachedImage
                src={recipe.imageLocation}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <img
                src="assets/imgs/logo_green_padded.png"
                alt=""
                className="size-10 shrink-0 rounded-full object-cover"
              />
            )}
            <span dir="auto" className="min-w-0 flex-1 truncate">
              {recipe.title}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);
