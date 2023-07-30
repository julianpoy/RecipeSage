/**
 * Model FCMToken
 *
 */
export type FCMToken = {
  id: string
  userId: string
  token: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model Friendship
 *
 */
export type Friendship = {
  id: string
  userId: string
  friendId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Model Image
 *
 */
export type Image = {
  id: string
  userId: string
  location: string | null
  key: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: Record<any, any> | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model Label
 *
 */
export type Label = {
  id: string
  userId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model MealPlanItem
 *
 */
export type MealPlanItem = {
  id: string
  userId: string
  mealPlanId: string
  recipeId: string | null
  title: string | null
  scheduled: Date | null
  meal: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model MealPlanCollaborator
 *
 */
export type MealPlanCollaborator = {
  id: string
  mealPlanId: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Model MealPlan
 *
 */
export type MealPlan = {
  id: string
  userId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model Message
 *
 */
export type Message = {
  id: string
  fromUserId: string
  toUserId: string
  recipeId: string | null
  originalRecipeId: string | null
  body: string | null
  type: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model ProfileItem
 *
 */
export type ProfileItem = {
  id: string
  userId: string
  recipeId: string | null
  labelId: string | null
  title: string
  type: string
  visibility: string
  order: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Model RecipeImage
 *
 */
export type RecipeImage = {
  id: string
  recipeId: string
  imageId: string
  order: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Model RecipeLabel
 *
 */
export type RecipeLabel = {
  id: string
  recipeId: string
  labelId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Model Recipe
 *
 */
export type Recipe = {
  id: string
  userId: string
  fromUserId: string | null
  title: string | null
  description: string | null
  yield: string | null
  activeTime: string | null
  totalTime: string | null
  source: string | null
  url: string | null
  notes: string | null
  ingredients: string | null
  instructions: string | null
  folder: string | null
  createdAt: Date
  updatedAt: Date
  indexedAt: Date | null
  rating: number | null
}

/**
 * Model Session
 *
 */
export type Session = {
  id: string
  userId: string
  type: string | null
  token: string | null
  expires: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model ShoppingListItem
 *
 */
export type ShoppingListItem = {
  id: string
  userId: string
  shoppingListId: string
  mealPlanItemId: string | null
  recipeId: string | null
  title: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Model ShoppingListCollaborator
 *
 */
export type ShoppingListCollaborator = {
  id: string
  shoppingListId: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Model ShoppingList
 *
 */
export type ShoppingList = {
  id: string
  userId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model StripePayment
 *
 */
export type StripePayment = {
  id: string
  userId: string | null
  amountPaid: number
  customerId: string
  customerEmail: string | null
  paymentIntentId: string
  subscriptionId: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoiceBlob: Record<any, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Model UserSubscription
 *
 */
export type UserSubscription = {
  id: string
  userId: string
  name: string | null
  expires: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Model UserProfileImage
 *
 */
export type UserProfileImage = {
  id: string
  userId: string
  imageId: string
  order: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Model User
 *
 */
export type User = {
  id: string
  name: string | null
  email: string | null
  passwordHash: string | null
  passwordSalt: string | null
  passwordVersion: number | null
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
  stripeCustomerId: string | null
  handle: string | null
  enableProfile: boolean
  profileVisibility: string | null
}
