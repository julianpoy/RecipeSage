import { pgTable, pgEnum, pgSchema, AnyPgColumn, foreignKey, unique, uuid, timestamp, varchar, integer, index, text, boolean, jsonb, bigint, doublePrecision, numeric } from "drizzle-orm/pg-core"


import { InferModel, sql } from "drizzle-orm"

export const Friendships = pgTable("Friendships", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	friendId: uuid("friendId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		friendshipsUserIdFriendIdUk: unique("Friendships_userId_friendId_uk").on(table.userId, table.friendId),
	}
});
export type Friendship = InferModel<typeof Friendships>;
export type NewFriendship = InferModel<typeof Friendships, 'insert'>;

export const Labels = pgTable("Labels", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: varchar("title", { length: 255 }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		labelsUserIdTitleUk: unique("Labels_userId_title_uk").on(table.userId, table.title),
	}
});
export type Label = InferModel<typeof Labels>;
export type NewLabel = InferModel<typeof Labels, 'insert'>;

export const MealPlanCollaborator = pgTable("MealPlan_Collaborators", {
	id: uuid("id").primaryKey().notNull(),
	mealPlanId: uuid("mealPlanId").notNull().references(() => MealPlans.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type MealPlanCollaborator = InferModel<typeof MealPlanCollaborator>;
export type NewMealPlanCollaborator = InferModel<typeof MealPlanCollaborator, 'insert'>;

export const ProfileItems = pgTable("ProfileItems", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	recipeId: uuid("recipeId").references(() => Recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	labelId: uuid("labelId").references(() => Labels.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: varchar("title", { length: 255 }).notNull(),
	type: varchar("type", { length: 255 }).notNull(),
	visibility: varchar("visibility", { length: 255 }).notNull(),
	order: integer("order").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type ProfileItem = InferModel<typeof ProfileItems>;
export type NewProfileItem = InferModel<typeof ProfileItems, 'insert'>;

export const RecipeImages = pgTable("Recipe_Images", {
	id: uuid("id").primaryKey().notNull(),
	recipeId: uuid("recipeId").notNull().references(() => Recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	imageId: uuid("imageId").notNull().references(() => Images.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	order: integer("order").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		recipeImagesRecipeId: index("recipe__images_recipe_id").on(table.recipeId),
		recipeImagesImageId: index("recipe__images_image_id").on(table.imageId),
	}
});
export type RecipeImage = InferModel<typeof RecipeImages>;
export type NewRecipeImage = InferModel<typeof RecipeImages, 'insert'>;

export const Messages = pgTable("Messages", {
	id: uuid("id").primaryKey().notNull(),
	fromUserId: uuid("fromUserId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	toUserId: uuid("toUserId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	recipeId: uuid("recipeId").references(() => Recipes.id, { onDelete: "set null", onUpdate: "cascade" } ),
	originalRecipeId: uuid("originalRecipeId").references(() => Recipes.id, { onDelete: "set null", onUpdate: "cascade" } ),
	body: text("body"),
	type: varchar("type", { length: 255 }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		messagesRecipeId: index("messages_recipe_id").on(table.recipeId),
		messagesOriginalRecipeId: index("messages_original_recipe_id").on(table.originalRecipeId),
	}
});
export type Message = InferModel<typeof Messages>;
export type NewMessage = InferModel<typeof Messages, 'insert'>;

export const ShoppingListItems = pgTable("ShoppingListItems", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	shoppingListId: uuid("shoppingListId").notNull().references(() => ShoppingLists.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	mealPlanItemId: uuid("mealPlanItemId").references(() => MealPlanItems.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	recipeId: uuid("recipeId").references(() => Recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: text("title").notNull(),
	completed: boolean("completed").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		shoppingListItemsRecipeId: index("shopping_list_items_recipe_id").on(table.recipeId),
		shoppingListItemsShoppingListId: index("shopping_list_items_shopping_list_id").on(table.shoppingListId),
	}
});
export type ShoppingListItem = InferModel<typeof ShoppingListItems>;
export type NewShoppingListItem = InferModel<typeof ShoppingListItems, 'insert'>;

export const ShoppingLists = pgTable("ShoppingLists", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: text("title"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type ShoppingList = InferModel<typeof ShoppingLists>;
export type NewShoppingList = InferModel<typeof ShoppingLists, 'insert'>;

export const ShoppingListCollaborators = pgTable("ShoppingList_Collaborators", {
	id: uuid("id").primaryKey().notNull(),
	shoppingListId: uuid("shoppingListId").notNull().references(() => ShoppingLists.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type ShoppingListCollaborator = InferModel<typeof ShoppingListCollaborators>;
export type NewShoppingListCollaborator = InferModel<typeof ShoppingListCollaborators, 'insert'>;

export const UserSubscriptions = pgTable("UserSubscriptions", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	name: varchar("name", { length: 255 }),
	expires: timestamp("expires", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type UserSubscription = InferModel<typeof UserSubscriptions>;
export type NewUserSubscription = InferModel<typeof UserSubscriptions, 'insert'>;

export const Images = pgTable("Images", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "set null", onUpdate: "cascade" } ),
	location: varchar("location", { length: 255 }),
	key: varchar("key", { length: 255 }),
	json: jsonb("json"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		imagesUserId: index("images_user_id").on(table.userId),
	}
});
export type Image = InferModel<typeof Images>;
export type NewImage = InferModel<typeof Images, 'insert'>;

export const MealPlans = pgTable("MealPlans", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: text("title"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type MealPlan = InferModel<typeof MealPlans>;
export type NewMealPlan = InferModel<typeof MealPlans, 'insert'>;

export const RecipeLabels = pgTable("Recipe_Labels", {
	id: uuid("id").primaryKey().notNull(),
	recipeId: uuid("recipeId").notNull().references(() => Recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	labelId: uuid("labelId").notNull().references(() => Labels.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		recipeLabelsLabelId: index("recipe__labels_label_id").on(table.labelId),
		recipeLabelsRecipeId: index("recipe__labels_recipe_id").on(table.recipeId),
		recipeLabelsLabelIdRecipeIdUk: unique("Recipe_Labels_labelId_recipeId_uk").on(table.recipeId, table.labelId),
	}
});
export type RecipeLabel = InferModel<typeof RecipeLabels>;
export type NewRecipeLabel = InferModel<typeof RecipeLabels, 'insert'>;

export const Sessions = pgTable("Sessions", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	type: varchar("type", { length: 255 }),
	token: varchar("token", { length: 255 }),
	expires: timestamp("expires", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type Session = InferModel<typeof Sessions>;
export type NewSession = InferModel<typeof Sessions, 'insert'>;

export const StripePayments = pgTable("StripePayments", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	amountPaid: integer("amountPaid").notNull(),
	customerId: varchar("customerId", { length: 255 }).notNull(),
	customerEmail: varchar("customerEmail", { length: 255 }),
	paymentIntentId: varchar("paymentIntentId", { length: 255 }).notNull(),
	subscriptionId: varchar("subscriptionId", { length: 255 }),
	invoiceBlob: jsonb("invoiceBlob").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		stripePaymentsPaymentIntentIdKey: unique("StripePayments_paymentIntentId_key").on(table.paymentIntentId),
	}
});
export type StripePayment = InferModel<typeof StripePayments>;
export type NewStripePayment = InferModel<typeof StripePayments, 'insert'>;

export const UserProfileImages = pgTable("User_Profile_Images", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	imageId: uuid("imageId").notNull().references(() => Images.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	order: integer("order").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type UserProfileImage = InferModel<typeof UserProfileImages>;
export type NewUserProfileImate = InferModel<typeof UserProfileImages, 'insert'>;

export const Recipes = pgTable("Recipes", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	fromUserId: uuid("fromUserId").references(() => Users.id, { onDelete: "set null", onUpdate: "cascade" } ),
	title: varchar("title", { length: 255 }),
	description: text("description"),
	yield: text("yield"),
	activeTime: text("activeTime"),
	totalTime: text("totalTime"),
	source: text("source"),
	url: text("url"),
	notes: text("notes"),
	ingredients: text("ingredients"),
	instructions: text("instructions"),
	folder: varchar("folder", { length: 255 }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
	indexedAt: timestamp("indexedAt", { withTimezone: true, mode: 'string' }),
	rating: integer("rating"),
},
(table) => {
	return {
		recipesUserId: index("recipes_user_id").on(table.userId),
		recipesFromUserId: index("recipes_from_user_id").on(table.fromUserId),
	}
});
export type Recipe = InferModel<typeof Recipes>;
export type NewRecipe = InferModel<typeof Recipes, 'insert'>;

export const Users = pgTable("Users", {
	id: uuid("id").primaryKey().notNull(),
	name: text("name"),
	email: text("email"),
	passwordHash: text("passwordHash"),
	passwordSalt: text("passwordSalt"),
	passwordVersion: integer("passwordVersion"),
	lastLogin: timestamp("lastLogin", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
	stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
	handle: varchar("handle", { length: 255 }),
	enableProfile: boolean("enableProfile").default(false).notNull(),
	profileVisibility: varchar("profileVisibility", { length: 255 }),
},
(table) => {
	return {
		usersEmailUk: unique("Users_email_uk").on(table.email),
		usersStripeCustomerIdKey: unique("Users_stripeCustomerId_key").on(table.stripeCustomerId),
		usersHandleUk: unique("Users_handle_uk").on(table.handle),
	}
});
export type User = InferModel<typeof Users>;
export type NewUser = InferModel<typeof Users, 'insert'>;

export const FcmTokens = pgTable("FCMTokens", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	token: text("token"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});
export type FcmToken = InferModel<typeof FcmTokens>;
export type NewFcmToken = InferModel<typeof FcmTokens, 'insert'>;

export const MealPlanItems = pgTable("MealPlanItems", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => Users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	mealPlanId: uuid("mealPlanId").notNull().references(() => MealPlans.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	recipeId: uuid("recipeId").references(() => Recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: text("title"),
	scheduled: timestamp("scheduled", { withTimezone: true, mode: 'string' }),
	meal: varchar("meal", { length: 255 }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		mealPlanItemsRecipeId: index("meal_plan_items_recipe_id").on(table.recipeId),
		mealPlanItemsMealPlanId: index("meal_plan_items_meal_plan_id").on(table.mealPlanId),
	}
});
export type MealPlanItem = InferModel<typeof MealPlanItems>;
export type NewMealPlanItem = InferModel<typeof MealPlanItems, 'insert'>;

