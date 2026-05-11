import { faker } from "@faker-js/faker";

export function profileItemFactory(args: {
  userId: string;
  type: "all-recipes" | "label" | "recipe";
  visibility: "public" | "friends-only" | "private";
  labelId?: string;
  recipeId?: string;
}) {
  return {
    userId: args.userId,
    type: args.type,
    visibility: args.visibility,
    labelId: args.labelId,
    recipeId: args.recipeId,
    title: faker.string.alphanumeric(10),
    order: 0,
  };
}
