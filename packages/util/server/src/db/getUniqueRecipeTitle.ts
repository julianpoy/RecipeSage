import { prisma, PrismaTransactionClient } from "@recipesage/prisma";
import { stripNumberedRecipeTitle } from "@recipesage/util/shared";

const MAX_DUPE_RENAMES = 1001;
const MAX_DUPES_RETRIEVED = 1000;

const escapeLikeWildcards = (value: string): string =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`);

export const getUniqueRecipeTitle = async (
  userId: string,
  title: string,
  options?: {
    tx?: PrismaTransactionClient;
    ignoreRecipeIds?: string[];
  },
): Promise<string> => {
  const tx = options?.tx ?? prisma;
  const ignoreRecipeIds = options?.ignoreRecipeIds ?? [];
  const strippedRecipeTitle = stripNumberedRecipeTitle(title);

  const recipes = await tx.recipe.findMany({
    where: {
      userId,
      id: {
        notIn: ignoreRecipeIds,
      },
      OR: [
        {
          title: strippedRecipeTitle,
        },
        {
          title: {
            startsWith: escapeLikeWildcards(strippedRecipeTitle) + " (",
          },
        },
      ],
    },
    select: {
      title: true,
    },
    take: MAX_DUPES_RETRIEVED,
  });

  const recipeTitles = new Set(recipes.map((recipe) => recipe.title));

  if (!recipeTitles.has(strippedRecipeTitle)) return strippedRecipeTitle;

  let candidate = "";
  let count = 1;
  while (count < MAX_DUPE_RENAMES) {
    candidate = `${strippedRecipeTitle} (${count})`;
    if (!recipeTitles.has(candidate)) break;
    count++;
  }

  return candidate;
};
