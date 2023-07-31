import { pgTable, pgEnum, pgSchema, AnyPgColumn, foreignKey, unique, uuid, timestamp, varchar, integer, index, text, boolean, jsonb, bigint, doublePrecision, numeric } from "drizzle-orm/pg-core"


import { sql } from "drizzle-orm"

export const friendships = pgTable("Friendships", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	friendId: uuid("friendId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		friendshipsUserIdFriendIdUk: unique("Friendships_userId_friendId_uk").on(table.userId, table.friendId),
	}
});

export const labels = pgTable("Labels", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: varchar("title", { length: 255 }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		labelsUserIdTitleUk: unique("Labels_userId_title_uk").on(table.userId, table.title),
	}
});

export const mealPlanCollaborators = pgTable("MealPlan_Collaborators", {
	id: uuid("id").primaryKey().notNull(),
	mealPlanId: uuid("mealPlanId").notNull().references(() => mealPlans.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const profileItems = pgTable("ProfileItems", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	recipeId: uuid("recipeId").references(() => recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	labelId: uuid("labelId").references(() => labels.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: varchar("title", { length: 255 }).notNull(),
	type: varchar("type", { length: 255 }).notNull(),
	visibility: varchar("visibility", { length: 255 }).notNull(),
	order: integer("order").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const recipeImages = pgTable("Recipe_Images", {
	id: uuid("id").primaryKey().notNull(),
	recipeId: uuid("recipeId").notNull().references(() => recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	imageId: uuid("imageId").notNull().references(() => images.id, { onDelete: "cascade", onUpdate: "cascade" } ),
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

export const messages = pgTable("Messages", {
	id: uuid("id").primaryKey().notNull(),
	fromUserId: uuid("fromUserId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	toUserId: uuid("toUserId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	recipeId: uuid("recipeId").references(() => recipes.id, { onDelete: "set null", onUpdate: "cascade" } ),
	originalRecipeId: uuid("originalRecipeId").references(() => recipes.id, { onDelete: "set null", onUpdate: "cascade" } ),
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

export const shoppingListItems = pgTable("ShoppingListItems", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	shoppingListId: uuid("shoppingListId").notNull().references(() => shoppingLists.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	mealPlanItemId: uuid("mealPlanItemId").references(() => mealPlanItems.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	recipeId: uuid("recipeId").references(() => recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
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

export const shoppingLists = pgTable("ShoppingLists", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: text("title"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const shoppingListCollaborators = pgTable("ShoppingList_Collaborators", {
	id: uuid("id").primaryKey().notNull(),
	shoppingListId: uuid("shoppingListId").notNull().references(() => shoppingLists.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const userSubscriptions = pgTable("UserSubscriptions", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	name: varchar("name", { length: 255 }),
	expires: timestamp("expires", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const images = pgTable("Images", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "set null", onUpdate: "cascade" } ),
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

export const mealPlans = pgTable("MealPlans", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	title: text("title"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const recipeLabels = pgTable("Recipe_Labels", {
	id: uuid("id").primaryKey().notNull(),
	recipeId: uuid("recipeId").notNull().references(() => recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	labelId: uuid("labelId").notNull().references(() => labels.id, { onDelete: "cascade", onUpdate: "cascade" } ),
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

export const sessions = pgTable("Sessions", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	type: varchar("type", { length: 255 }),
	token: varchar("token", { length: 255 }),
	expires: timestamp("expires", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const stripePayments = pgTable("StripePayments", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
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

export const userProfileImages = pgTable("User_Profile_Images", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	imageId: uuid("imageId").notNull().references(() => images.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	order: integer("order").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const recipes = pgTable("Recipes", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	fromUserId: uuid("fromUserId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" } ),
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

export const users = pgTable("Users", {
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

export const fcmTokens = pgTable("FCMTokens", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	token: text("token"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).notNull(),
});

export const mealPlanItems = pgTable("MealPlanItems", {
	id: uuid("id").primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	mealPlanId: uuid("mealPlanId").notNull().references(() => mealPlans.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	recipeId: uuid("recipeId").references(() => recipes.id, { onDelete: "cascade", onUpdate: "cascade" } ),
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

