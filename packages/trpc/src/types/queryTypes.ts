import { z } from "zod";

// export type UserSummary = Pick<User,
//   'id' |
//   'email' |
//   'name' |
//   'handle' |
//   'profileVisibility' |
//   'enableProfile'
// >;
//
export const zUserSummary = z.object({
  id: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  handle: z.string().optional(),
  profileVisibility: z.string().optional(),
  enableProfile: z.boolean()
});

export type UserSummary = z.infer<typeof zUserSummary>;

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export const zRecipeSummary = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fromUserId: z.string().uuid().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  yield: z.string().optional(),
  activeTime: z.string().optional(),
  totalTime: z.string().optional(),
  source: z.string().optional(),
  url: z.string().optional(),
  folder: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  rating: z.number().optional(),
  recipeLabels: z.array(z.object({
    label: z.object({
      title: z.string().optional()
    })
  })),
  recipeImages: z.array(z.object({
    image: z.object({
      location: z.string().optional()
    })
  })),
  user: zUserSummary,
  fromUser: zUserSummary.optional(),
});

export type RecipeSummary = z.infer<typeof zRecipeSummary>;

// const result = zRecipeSchema.parse({
//   id: 'd6b8f708-cfb7-4876-8c04-7ca08477a4a1',
//   userId: 'd6b8f708-cfb7-4876-8c04-7ca08477a4a1',
//   fromUserId: 'd6b8f708-cfb7-4876-8c04-7ca08477a4a1',
//   title: 'asdf',
//   description: 'asdf',
//   yield: 'asdf',
//   activeTime: 'asdf',
//   totalTime: 'asdf',
//   source: 'asdf',
//   url: 'asdf',
//   folder: 'asdf',
//   createdAt: 'asdf',
//   updatedAt: 'asdf',
//   rating: 'asdf',
//   recipeLabels: [{
//     label: {
//       title: 'asdf'
//     }
//   }],
//   recipeImages: [{
//     image: {
//       location: 'asdf'
//     }
//   }],
//   user: {
//     asdf: 'e',
//     id: 'asdf',
//     email: 'asdf',
//     name: 'asdf',
//     handle: 'asdf',
//     profileVisibility: 'asdf',
//     enableProfile: true
//   },
//   fromUser: {
//     id: 'asdf',
//     email: 'asdf',
//     name: 'asdf',
//     handle: 'asdf',
//     profileVisibility: 'asdf',
//     enableProfile: true
//   },
// });
//
// console.log(result);

// export type RecipeSummary = Pick<Recipe,
//   'id' |
//   'user' |
//   'fromUser' |
//   'title' |
//   'description' |
//   'yield' |
//   'activeTime' |
//   'totalTime' |
//   'source' |
//   'url' |
//   'folder' |
//   'createdAt' |
//   'updatedAt' |
//   'rating'
// > & {
//   recipeLabels: {
//     label: Pick<Label, 'title'>
//   }[],
//   recipeImages: (Pick<RecipeImage, 'order'> & {
//     image: Pick<Image, 'location'>
//   })[],
//   user: UserSummary,
//   fromUser: UserSummary
// };

